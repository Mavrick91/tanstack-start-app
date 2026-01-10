/**
 * Order Refunds Module
 *
 * Handles refund processing for Stripe and PayPal payments,
 * including order cancellation with automatic refunds.
 */

import { desc, eq } from 'drizzle-orm'

import { db } from '../../db'
import { orders, orderStatusHistory } from '../../db/schema'

export interface RefundResult {
  success: boolean
  refundId?: string
  error?: string
}

export interface CancellationResult {
  success: boolean
  refundResult?: RefundResult
  error?: string
}

export interface OrderStatusChange {
  orderId: string
  field: 'status' | 'paymentStatus' | 'fulfillmentStatus'
  previousValue: string
  newValue: string
  changedBy: string
  changedAt: Date
  reason?: string
}

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
export const refundStripePayment = async (
  paymentId: string,
): Promise<RefundResult> => {
  try {
    const { stripe } = await import('../../lib/stripe')
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
export const refundPayPalPayment = async (
  paymentId: string,
): Promise<RefundResult> => {
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
): Promise<RefundResult> => {
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

// Record an order status change in the audit trail
const recordStatusChange = async (change: OrderStatusChange) => {
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

// Get audit trail for an order (used by cancelOrderWithRefund indirectly)
export const getRefundAuditTrail = async (orderId: string) => {
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt))

  return history
    .filter(
      (entry) =>
        entry.newValue === 'refunded' || entry.newValue === 'cancelled',
    )
    .map((entry) => ({
      orderId: entry.orderId,
      field: entry.field as 'status' | 'paymentStatus' | 'fulfillmentStatus',
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      changedBy: entry.changedBy,
      changedAt: entry.createdAt,
      reason: entry.reason || undefined,
    }))
}

/**
 * Process order cancellation with automatic refund if payment was made
 */
export const cancelOrderWithRefund = async (
  orderId: string,
  changedBy: string,
  reason?: string,
): Promise<CancellationResult> => {
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
