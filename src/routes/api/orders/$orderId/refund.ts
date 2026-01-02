import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { orders } from '../../../../db/schema'
import {
  errorResponse,
  requireAdmin,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { findOrderById } from '../../../../lib/db/queries'
import { processRefund, recordStatusChange } from '../../../../server/orders'

export const Route = createFileRoute('/api/orders/$orderId/refund')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const auth = await requireAdmin(request)
          if (!auth.success || !auth.user) return auth.response

          const { orderId } = params
          const body = await request.json()
          const { reason } = body as { reason?: string }

          // Get order
          const order = await findOrderById(orderId)

          if (!order) {
            return simpleErrorResponse('Order not found', 404)
          }

          // Validate order can be refunded
          if (order.paymentStatus !== 'paid') {
            return simpleErrorResponse(
              `Cannot refund order with payment status: ${order.paymentStatus}`,
              400,
            )
          }

          if (!order.paymentId || !order.paymentProvider) {
            return simpleErrorResponse(
              'Order has no payment information for refund',
              400,
            )
          }

          // Process refund
          const refundResult = await processRefund(
            order.paymentProvider,
            order.paymentId,
          )

          if (!refundResult.success) {
            return simpleErrorResponse(
              refundResult.error || 'Refund failed',
              500,
            )
          }

          // Update order payment status
          await db
            .update(orders)
            .set({
              paymentStatus: 'refunded',
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId))

          // Type narrowing: refundResult.success is true and has refundId
          if (!('refundId' in refundResult)) {
            return simpleErrorResponse(
              'Refund succeeded but no refund ID returned',
              500,
            )
          }

          // Record in audit trail
          await recordStatusChange({
            orderId,
            field: 'paymentStatus',
            previousValue: order.paymentStatus,
            newValue: 'refunded',
            changedBy: auth.user.id,
            changedAt: new Date(),
            reason: reason
              ? `Admin refund: ${reason}. Refund ID: ${refundResult.refundId}`
              : `Admin refund. Refund ID: ${refundResult.refundId}`,
          })

          return successResponse({
            success: true,
            refundId: refundResult.refundId,
            message: 'Order refunded successfully',
          })
        } catch (error) {
          return errorResponse('Failed to process refund', error)
        }
      },
    },
  },
})
