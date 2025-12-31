import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { orders, orderItems, customers } from '../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'
import {
  parseDecimal,
  recordStatusChange,
  validateManualPaymentStatusChange,
  cancelOrderWithRefund,
  type PaymentStatus,
} from '../../../server/orders'

export const Route = createFileRoute('/api/orders/$orderId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response
          if (!auth.user) {
            return simpleErrorResponse('Unauthorized', 401)
          }

          // Only admin can access order details
          if (auth.user.role !== 'admin') {
            return new Response('Forbidden', { status: 403 })
          }

          const { orderId } = params

          // Get order
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1)

          if (!order) {
            return simpleErrorResponse('Order not found', 404)
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

          return successResponse({
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
              shippingMethod: order.shippingMethod,
              shippingAddress: order.shippingAddress,
              billingAddress: order.billingAddress,
              paymentProvider: order.paymentProvider,
              paymentId: order.paymentId,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              paidAt: order.paidAt,
              cancelledAt: order.cancelledAt,
              items: items.map((item) => ({
                id: item.id,
                title: item.title,
                variantTitle: item.variantTitle,
                sku: item.sku,
                price: parseDecimal(item.price),
                quantity: item.quantity,
                total: parseDecimal(item.total),
                imageUrl: item.imageUrl,
              })),
              customer: customer
                ? {
                    id: customer.id,
                    email: customer.email,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    phone: customer.phone,
                  }
                : null,
            },
          })
        } catch (error) {
          return errorResponse('Failed to fetch order', error)
        }
      },

      PATCH: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response
          if (!auth.user) {
            return simpleErrorResponse('Unauthorized', 401)
          }

          // Only admin can update orders
          if (auth.user.role !== 'admin') {
            return new Response('Forbidden', { status: 403 })
          }

          const { orderId } = params
          const body = await request.json()
          const { status, paymentStatus, fulfillmentStatus, reason } = body

          // Get order
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1)

          if (!order) {
            return simpleErrorResponse('Order not found', 404)
          }

          // Handle cancellation with refund
          if (status === 'cancelled' && order.status !== 'cancelled') {
            const cancellationResult = await cancelOrderWithRefund(
              orderId,
              auth.user.id,
              reason,
            )

            if (!cancellationResult.success) {
              return simpleErrorResponse(
                cancellationResult.error || 'Failed to cancel order',
              )
            }

            // Fetch updated order
            const [updatedOrder] = await db
              .select()
              .from(orders)
              .where(eq(orders.id, orderId))
              .limit(1)

            return successResponse({
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
            })
          }

          // Build update object
          const updates: Record<string, unknown> = {
            updatedAt: new Date(),
          }

          if (status && status !== order.status) {
            const validStatuses = [
              'pending',
              'processing',
              'shipped',
              'delivered',
              'cancelled',
            ]
            if (!validStatuses.includes(status)) {
              return simpleErrorResponse('Invalid status')
            }
            updates.status = status

            // Record in audit trail
            await recordStatusChange({
              orderId,
              field: 'status',
              previousValue: order.status,
              newValue: status,
              changedBy: auth.user.id,
              changedAt: new Date(),
              reason,
            })
          }

          if (paymentStatus && paymentStatus !== order.paymentStatus) {
            const validPaymentStatuses = [
              'pending',
              'paid',
              'failed',
              'refunded',
            ]
            if (!validPaymentStatuses.includes(paymentStatus)) {
              return simpleErrorResponse('Invalid payment status')
            }

            // Validate manual payment status change to 'paid'
            const validation = validateManualPaymentStatusChange(
              order.paymentStatus as PaymentStatus,
              paymentStatus as PaymentStatus,
              !!order.paymentId,
              reason,
            )

            if (!validation.allowed) {
              return simpleErrorResponse(
                validation.error || 'Payment status change not allowed',
                400,
              )
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
              changedBy: auth.user.id,
              changedAt: new Date(),
              reason:
                reason ||
                (order.paymentId
                  ? `Verified payment: ${order.paymentId}`
                  : 'Manual update'),
            })
          }

          if (
            fulfillmentStatus &&
            fulfillmentStatus !== order.fulfillmentStatus
          ) {
            const validFulfillmentStatuses = [
              'unfulfilled',
              'partial',
              'fulfilled',
            ]
            if (!validFulfillmentStatuses.includes(fulfillmentStatus)) {
              return simpleErrorResponse('Invalid fulfillment status')
            }
            updates.fulfillmentStatus = fulfillmentStatus

            // Record in audit trail
            await recordStatusChange({
              orderId,
              field: 'fulfillmentStatus',
              previousValue: order.fulfillmentStatus,
              newValue: fulfillmentStatus,
              changedBy: auth.user.id,
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

          return successResponse({
            order: {
              id: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              status: updatedOrder.status,
              paymentStatus: updatedOrder.paymentStatus,
              fulfillmentStatus: updatedOrder.fulfillmentStatus,
              updatedAt: updatedOrder.updatedAt,
            },
          })
        } catch (error) {
          return errorResponse('Failed to update order', error)
        }
      },
    },
  },
})
