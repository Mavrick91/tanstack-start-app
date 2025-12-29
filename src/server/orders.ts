import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db'
import { orders, orderItems } from '../db/schema'
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
export function parseDecimal(value: string): number {
  // Parse as string, then convert to number with fixed precision
  const parsed = parseFloat(value)
  // Round to 2 decimal places to avoid floating-point representation issues
  return Math.round(parsed * 100) / 100
}

/**
 * Format number to decimal string for database storage
 */
export function toDecimalString(value: number): string {
  return value.toFixed(2)
}

// ============================================
// N+1 QUERY FIX: BATCH ITEM COUNTS
// ============================================

/**
 * Get item counts for multiple orders in a single query
 * Fixes N+1 query problem in order listing
 */
export async function getOrderItemCounts(
  orderIds: string[],
): Promise<Map<string, number>> {
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
export async function getOrderItemsByOrderIds(
  orderIds: string[],
): Promise<Map<string, (typeof orderItems.$inferSelect)[]>> {
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

// ============================================
// ORDER STATUS AUDIT TRAIL
// ============================================

// In-memory audit log for now (could be extended to database table)
const auditLog: OrderStatusChange[] = []

/**
 * Record an order status change in the audit trail
 */
export function recordStatusChange(change: OrderStatusChange): void {
  auditLog.push(change)
}

/**
 * Get audit trail for an order
 */
export function getOrderAuditTrail(orderId: string): OrderStatusChange[] {
  return auditLog.filter((entry) => entry.orderId === orderId)
}

/**
 * Clear audit trail (for testing)
 */
export function clearAuditTrail(): void {
  auditLog.length = 0
}

// ============================================
// PAYMENT STATUS VALIDATION
// ============================================

/**
 * Validate if manual payment status change to 'paid' is allowed
 * Manual changes to 'paid' require justification and are logged
 */
export function validateManualPaymentStatusChange(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus,
  hasPaymentId: boolean,
  reason?: string,
): { allowed: boolean; error?: string; requiresConfirmation?: boolean } {
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

async function getPayPalAccessToken(): Promise<string> {
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
export async function refundStripePayment(
  paymentId: string,
): Promise<RefundResult> {
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
export async function refundPayPalPayment(
  paymentId: string,
): Promise<RefundResult> {
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
export async function processRefund(
  paymentProvider: string | null,
  paymentId: string | null,
): Promise<RefundResult> {
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
export async function cancelOrderWithRefund(
  orderId: string,
  changedBy: string,
  reason?: string,
): Promise<CancellationResult> {
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
  recordStatusChange({
    orderId,
    field: 'status',
    previousValue: order.status,
    newValue: 'cancelled',
    changedBy,
    changedAt: new Date(),
    reason,
  })

  if (refundResult?.success) {
    recordStatusChange({
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
