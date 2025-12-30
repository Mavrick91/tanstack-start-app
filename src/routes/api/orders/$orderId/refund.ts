import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { orders } from '../../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { processRefund, recordStatusChange } from '../../../../server/orders'

export const Route = createFileRoute('/api/orders/$orderId/refund')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          // Require admin authentication
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          if (auth.user.role !== 'admin') {
            return new Response('Forbidden', { status: 403 })
          }

          const { orderId } = params
          const body = await request.json()
          const { reason } = body as { reason?: string }

          // Get order
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1)

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
