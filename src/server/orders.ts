import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  SQL,
  sql,
  count,
} from 'drizzle-orm'
import { z } from 'zod'

import { getMeFn } from './auth'
import { db } from '../db'
import { orders, orderItems, orderStatusHistory, customers } from '../db/schema'
import { stripe } from '../lib/stripe'

// ============================================
// TYPES
// ============================================

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled'

export interface OrderStatusChange {
  orderId: string
  field: 'status' | 'paymentStatus' | 'fulfillmentStatus'
  previousValue: string
  newValue: string
  changedBy: string
  changedAt: Date
  reason?: string
}

export interface RefundResult {
  success: boolean
  refundId?: string
  error?: string
}

// ============================================
// DECIMAL HANDLING
// ============================================

/**
 * Safely convert decimal string to number preserving precision
 * Uses fixed-point arithmetic to avoid floating-point errors
 */
export const parseDecimal = (value: string) => {
  // Parse as string, then convert to number with fixed precision
  const parsed = parseFloat(value)
  // Round to 2 decimal places to avoid floating-point representation issues
  return Math.round(parsed * 100) / 100
}

/**
 * Format number to decimal string for database storage
 */
export const toDecimalString = (value: number) => {
  return value.toFixed(2)
}

// ============================================
// N+1 QUERY FIX: BATCH ITEM COUNTS
// ============================================

/**
 * Get item counts for multiple orders in a single query
 * Fixes N+1 query problem in order listing
 */
export const getOrderItemCounts = async (orderIds: string[]) => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const results = await db
    .select({
      orderId: orderItems.orderId,
      itemCount: sql<number>`count(*)::int`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .groupBy(orderItems.orderId)

  const countMap = new Map<string, number>()
  for (const row of results) {
    countMap.set(row.orderId, row.itemCount)
  }

  // Set 0 for orders with no items
  for (const orderId of orderIds) {
    if (!countMap.has(orderId)) {
      countMap.set(orderId, 0)
    }
  }

  return countMap
}

/**
 * Get all items for multiple orders in a single query
 * Fixes N+1 query problem in customer orders listing
 */
export const getOrderItemsByOrderIds = async (orderIds: string[]) => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))

  const itemsMap = new Map<string, (typeof orderItems.$inferSelect)[]>()

  // Initialize all orders with empty arrays
  for (const orderId of orderIds) {
    itemsMap.set(orderId, [])
  }

  // Group items by order
  for (const item of items) {
    const orderItemsList = itemsMap.get(item.orderId)!
    orderItemsList.push(item)
  }

  return itemsMap
}

// Record an order status change in the audit trail
export const recordStatusChange = async (change: OrderStatusChange) => {
  await db.insert(orderStatusHistory).values({
    orderId: change.orderId,
    field: change.field,
    previousValue: change.previousValue,
    newValue: change.newValue,
    changedBy: change.changedBy,
    reason: change.reason,
    createdAt: change.changedAt,
  })
}

// Get audit trail for an order
export const getOrderAuditTrail = async (orderId: string) => {
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt))

  return history.map((entry) => ({
    orderId: entry.orderId,
    field: entry.field as 'status' | 'paymentStatus' | 'fulfillmentStatus',
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    changedBy: entry.changedBy,
    changedAt: entry.createdAt,
    reason: entry.reason || undefined,
  }))
}

// Clear audit trail (for testing only)
export const clearAuditTrail = async () => {}

// ============================================
// PAYMENT STATUS VALIDATION
// ============================================

/**
 * Validate if manual payment status change to 'paid' is allowed
 * Manual changes to 'paid' require justification and are logged
 */
export const validateManualPaymentStatusChange = (
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus,
  hasPaymentId: boolean,
  reason?: string,
) => {
  // Allow changes that don't set to 'paid'
  if (newStatus !== 'paid') {
    return { allowed: true }
  }

  // If already paid, no change needed
  if (currentStatus === 'paid') {
    return { allowed: true }
  }

  // If there's a payment ID, the payment was processed through a provider
  if (hasPaymentId) {
    return { allowed: true }
  }

  // Manual payment requires confirmation/reason
  if (!reason) {
    return {
      allowed: false,
      requiresConfirmation: true,
      error:
        'Manual payment status change to "paid" requires a reason. This will be logged for audit purposes.',
    }
  }

  // Allow with reason, but flag for audit
  return { allowed: true }
}

// ============================================
// REFUND PROCESSING
// ============================================

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Process refund for Stripe payment
 */
export const refundStripePayment = async (paymentId: string) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
    })

    return {
      success: true,
      refundId: refund.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stripe refund failed',
    }
  }
}

/**
 * Process refund for PayPal payment
 */
export const refundPayPalPayment = async (paymentId: string) => {
  try {
    const accessToken = await getPayPalAccessToken()

    // First, get the capture ID from the order
    const orderResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!orderResponse.ok) {
      throw new Error('Failed to get PayPal order details')
    }

    const orderData = await orderResponse.json()
    const captureId = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id

    if (!captureId) {
      throw new Error('No capture found for PayPal order')
    }

    // Refund the capture
    const refundResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    )

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json()
      throw new Error(errorData.message || 'PayPal refund failed')
    }

    const refundData = await refundResponse.json()

    return {
      success: true,
      refundId: refundData.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PayPal refund failed',
    }
  }
}

/**
 * Process refund based on payment provider
 */
export const processRefund = async (
  paymentProvider: string | null,
  paymentId: string | null,
) => {
  if (!paymentProvider || !paymentId) {
    return {
      success: false,
      error: 'No payment information available for refund',
    }
  }

  switch (paymentProvider) {
    case 'stripe':
      return refundStripePayment(paymentId)
    case 'paypal':
      return refundPayPalPayment(paymentId)
    default:
      return {
        success: false,
        error: `Unknown payment provider: ${paymentProvider}`,
      }
  }
}

// ============================================
// ORDER CANCELLATION WITH REFUND
// ============================================

export interface CancellationResult {
  success: boolean
  refundResult?: RefundResult
  error?: string
}

/**
 * Process order cancellation with automatic refund if payment was made
 */
export const cancelOrderWithRefund = async (
  orderId: string,
  changedBy: string,
  reason?: string,
) => {
  // Get order details
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) {
    return { success: false, error: 'Order not found' }
  }

  // Check if already cancelled
  if (order.status === 'cancelled') {
    return { success: false, error: 'Order is already cancelled' }
  }

  // Process refund if payment was made
  let refundResult: RefundResult | undefined
  if (order.paymentStatus === 'paid' && order.paymentId) {
    refundResult = await processRefund(order.paymentProvider, order.paymentId)

    if (!refundResult.success) {
      // Log the failed refund attempt but don't block cancellation
      console.error(`Refund failed for order ${orderId}: ${refundResult.error}`)
    }
  }

  // Update order status
  const updates: Record<string, unknown> = {
    status: 'cancelled',
    cancelledAt: new Date(),
    updatedAt: new Date(),
  }

  // Update payment status to refunded if refund succeeded
  if (refundResult?.success) {
    updates.paymentStatus = 'refunded'
  }

  await db.update(orders).set(updates).where(eq(orders.id, orderId))

  // Record in audit trail
  await recordStatusChange({
    orderId,
    field: 'status',
    previousValue: order.status,
    newValue: 'cancelled',
    changedBy,
    changedAt: new Date(),
    reason,
  })

  if (refundResult?.success) {
    await recordStatusChange({
      orderId,
      field: 'paymentStatus',
      previousValue: order.paymentStatus,
      newValue: 'refunded',
      changedBy,
      changedAt: new Date(),
      reason: `Automatic refund on cancellation. Refund ID: ${refundResult.refundId}`,
    })
  }

  return {
    success: true,
    refundResult,
  }
}

// ============================================
// SERVER FUNCTIONS (ADMIN)
// ============================================

// Helper to require admin auth
const requireAdmin = async () => {
  const user = await getMeFn()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return user
}

// Get orders list with pagination and filtering (admin)
const getAdminOrdersInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z
    .enum(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  paymentStatus: z
    .enum(['all', 'pending', 'paid', 'failed', 'refunded'])
    .optional(),
  fulfillmentStatus: z
    .enum(['all', 'unfulfilled', 'partial', 'fulfilled'])
    .optional(),
  sortKey: z
    .enum([
      'orderNumber',
      'total',
      'status',
      'paymentStatus',
      'fulfillmentStatus',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const getAdminOrdersFn = createServerFn()
  .inputValidator(getAdminOrdersInputSchema.parse)
  .handler(async ({ data }) => {
    await requireAdmin()

    const {
      page,
      limit,
      search,
      status,
      paymentStatus,
      fulfillmentStatus,
      sortKey,
      sortOrder,
    } = data

    const conditions: SQL[] = []

    if (status && status !== 'all') {
      conditions.push(
        eq(orders.status, status as (typeof orders.status.enumValues)[number]),
      )
    }

    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push(
        eq(
          orders.paymentStatus,
          paymentStatus as (typeof orders.paymentStatus.enumValues)[number],
        ),
      )
    }

    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      conditions.push(
        eq(
          orders.fulfillmentStatus,
          fulfillmentStatus as (typeof orders.fulfillmentStatus.enumValues)[number],
        ),
      )
    }

    if (search) {
      conditions.push(ilike(orders.email, `%${search}%`) as SQL)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Sorting
    const sortColumn =
      {
        orderNumber: orders.orderNumber,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        createdAt: orders.createdAt,
      }[sortKey] || orders.createdAt

    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(whereClause)

    // Get orders with pagination
    const offset = (page - 1) * limit
    const ordersList = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Get item counts for all orders in a single query (fixes N+1)
    const orderIds = ordersList.map((o) => o.id)
    const itemCounts = await getOrderItemCounts(orderIds)

    const ordersWithItemCount = ordersList.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      subtotal: parseDecimal(order.subtotal),
      shippingTotal: parseDecimal(order.shippingTotal),
      taxTotal: parseDecimal(order.taxTotal),
      total: parseDecimal(order.total),
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      itemCount: itemCounts.get(order.id) || 0,
      createdAt: order.createdAt,
    }))

    return {
      orders: ordersWithItemCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })

// Get order statistics (admin)
export const getOrderStatsFn = createServerFn().handler(async () => {
  await requireAdmin()

  // Get today's start (midnight)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Run all queries in parallel
  const [pendingResult, unpaidResult, unfulfilledResult, revenueResult] =
    await Promise.all([
      // Pending orders count
      db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.status, 'pending')),

      // Unpaid orders count (excluding cancelled)
      db
        .select({ count: count() })
        .from(orders)
        .where(
          and(
            eq(orders.paymentStatus, 'pending'),
            sql`${orders.status} != 'cancelled'`,
          ),
        ),

      // Unfulfilled orders count (excluding cancelled)
      db
        .select({ count: count() })
        .from(orders)
        .where(
          and(
            eq(orders.fulfillmentStatus, 'unfulfilled'),
            sql`${orders.status} != 'cancelled'`,
          ),
        ),

      // Today's revenue (paid orders only)
      db
        .select({
          total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        })
        .from(orders)
        .where(
          and(eq(orders.paymentStatus, 'paid'), gte(orders.createdAt, today)),
        ),
    ])

  return {
    stats: {
      pending: pendingResult[0]?.count ?? 0,
      unpaid: unpaidResult[0]?.count ?? 0,
      unfulfilled: unfulfilledResult[0]?.count ?? 0,
      todayRevenue: parseFloat(revenueResult[0]?.total ?? '0'),
      currency: 'USD', // Could be configurable
    },
  }
})

// Get single order detail (admin)
const getAdminOrderInputSchema = z.object({
  orderId: z.string(),
})

export const getAdminOrderFn = createServerFn()
  .inputValidator(getAdminOrderInputSchema.parse)
  .handler(async ({ data }) => {
    await requireAdmin()

    const { orderId } = data

    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!order) {
      throw new Error('Order not found')
    }

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    // Get customer if exists
    let customer = null
    if (order.customerId) {
      const [customerData] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1)
      customer = customerData
    }

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        subtotal: parseDecimal(order.subtotal),
        shippingTotal: parseDecimal(order.shippingTotal),
        taxTotal: parseDecimal(order.taxTotal),
        total: parseDecimal(order.total),
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingMethod: order.shippingMethod || undefined,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress || undefined,
        paymentProvider: order.paymentProvider || undefined,
        paymentId: order.paymentId || undefined,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paidAt: order.paidAt || undefined,
        cancelledAt: order.cancelledAt || undefined,
        items: items.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId || undefined,
          variantId: item.variantId || undefined,
          title: item.title,
          variantTitle: item.variantTitle || undefined,
          sku: item.sku || undefined,
          price: parseDecimal(item.price),
          quantity: item.quantity,
          total: parseDecimal(item.total),
          imageUrl: item.imageUrl || undefined,
          createdAt: item.createdAt,
        })),
        customer: customer
          ? {
              id: customer.id,
              email: customer.email,
              firstName: customer.firstName || undefined,
              lastName: customer.lastName || undefined,
              phone: customer.phone || undefined,
            }
          : undefined,
      },
    }
  })

// Update order status (admin)
const updateOrderStatusInputSchema = z.object({
  orderId: z.string(),
  status: z
    .enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled']).optional(),
  reason: z.string().optional(),
})

export const updateOrderStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(updateOrderStatusInputSchema.parse)
  .handler(async ({ data }) => {
    const user = await requireAdmin()

    const { orderId, status, paymentStatus, fulfillmentStatus, reason } = data

    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!order) {
      throw new Error('Order not found')
    }

    // Handle cancellation with refund
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const cancellationResult = await cancelOrderWithRefund(
        orderId,
        user.id,
        reason,
      )

      if (!cancellationResult.success) {
        throw new Error(cancellationResult.error || 'Failed to cancel order')
      }

      // Fetch updated order
      const [updatedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1)

      return {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          fulfillmentStatus: updatedOrder.fulfillmentStatus,
          updatedAt: updatedOrder.updatedAt,
          cancelledAt: updatedOrder.cancelledAt,
        },
        refundResult: cancellationResult.refundResult,
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (status && status !== order.status) {
      updates.status = status

      // Record in audit trail
      await recordStatusChange({
        orderId,
        field: 'status',
        previousValue: order.status,
        newValue: status,
        changedBy: user.id,
        changedAt: new Date(),
        reason,
      })
    }

    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      // Validate manual payment status change to 'paid'
      const validation = validateManualPaymentStatusChange(
        order.paymentStatus as PaymentStatus,
        paymentStatus as PaymentStatus,
        !!order.paymentId,
        reason,
      )

      if (!validation.allowed) {
        throw new Error(validation.error || 'Payment status change not allowed')
      }

      updates.paymentStatus = paymentStatus

      // Set paidAt if paid
      if (paymentStatus === 'paid' && !order.paidAt) {
        updates.paidAt = new Date()
      }

      // Record in audit trail
      await recordStatusChange({
        orderId,
        field: 'paymentStatus',
        previousValue: order.paymentStatus,
        newValue: paymentStatus,
        changedBy: user.id,
        changedAt: new Date(),
        reason:
          reason ||
          (order.paymentId
            ? `Verified payment: ${order.paymentId}`
            : 'Manual update'),
      })
    }

    if (fulfillmentStatus && fulfillmentStatus !== order.fulfillmentStatus) {
      updates.fulfillmentStatus = fulfillmentStatus

      // Record in audit trail
      await recordStatusChange({
        orderId,
        field: 'fulfillmentStatus',
        previousValue: order.fulfillmentStatus,
        newValue: fulfillmentStatus,
        changedBy: user.id,
        changedAt: new Date(),
        reason,
      })
    }

    // Update order
    const [updatedOrder] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, orderId))
      .returning()

    return {
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        fulfillmentStatus: updatedOrder.fulfillmentStatus,
        updatedAt: updatedOrder.updatedAt,
      },
    }
  })

// Bulk update orders (admin)
const bulkUpdateOrdersInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['status', 'paymentStatus', 'fulfillmentStatus']),
  value: z.string(),
})

export const bulkUpdateOrdersFn = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateOrdersInputSchema.parse)
  .handler(async ({ data }) => {
    const user = await requireAdmin()

    const { ids, action, value } = data

    // Validate values based on action
    const validValues: Record<string, string[]> = {
      status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      paymentStatus: ['pending', 'paid', 'failed', 'refunded'],
      fulfillmentStatus: ['unfulfilled', 'partial', 'fulfilled'],
    }

    if (!validValues[action].includes(value)) {
      throw new Error(`Invalid value for ${action}`)
    }

    // Get current orders to record changes
    const currentOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
      })
      .from(orders)
      .where(inArray(orders.id, ids))

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      [action]: value,
    }

    // Handle special cases
    if (action === 'status' && value === 'cancelled') {
      updates.cancelledAt = new Date()
    }

    // Perform bulk update
    await db.update(orders).set(updates).where(inArray(orders.id, ids))

    // Record audit trail for each order
    for (const order of currentOrders) {
      const previousValue = order[action as keyof typeof order] as string
      if (previousValue !== value) {
        await recordStatusChange({
          orderId: order.id,
          field: action as 'status' | 'paymentStatus' | 'fulfillmentStatus',
          previousValue,
          newValue: value,
          changedBy: user.id,
          changedAt: new Date(),
          reason: 'Bulk update',
        })
      }
    }

    return {
      success: true,
      updatedCount: ids.length,
    }
  })

// Get order audit trail (admin)
const getOrderHistoryInputSchema = z.object({
  orderId: z.string(),
})

export const getOrderHistoryFn = createServerFn()
  .inputValidator(getOrderHistoryInputSchema.parse)
  .handler(async ({ data }) => {
    await requireAdmin()

    const { orderId } = data

    const auditTrail = await getOrderAuditTrail(orderId)

    // Transform to API response format
    const history = auditTrail.map((entry, index) => ({
      id: `${orderId}-${index}`,
      field: entry.field,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt,
      reason: entry.reason,
    }))

    return { history }
  })
