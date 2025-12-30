import { createFileRoute } from '@tanstack/react-router'
import { inArray } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'
import { recordStatusChange } from '../../../server/orders'

export const Route = createFileRoute('/api/orders/bulk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          // Only admin can bulk update orders
          if (auth.user.role !== 'admin') {
            return new Response('Forbidden', { status: 403 })
          }

          const body = await request.json()
          const { ids, action, value } = body

          if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return simpleErrorResponse('No order IDs provided')
          }

          if (!action || !value) {
            return simpleErrorResponse('Action and value are required')
          }

          // Validate action type
          const validActions = ['status', 'fulfillmentStatus', 'paymentStatus']
          if (!validActions.includes(action)) {
            return simpleErrorResponse('Invalid action type')
          }

          // Validate values based on action
          const validValues: Record<string, string[]> = {
            status: [
              'pending',
              'processing',
              'shipped',
              'delivered',
              'cancelled',
            ],
            paymentStatus: ['pending', 'paid', 'failed', 'refunded'],
            fulfillmentStatus: ['unfulfilled', 'partial', 'fulfilled'],
          }

          if (!validValues[action].includes(value)) {
            return simpleErrorResponse(`Invalid value for ${action}`)
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
                field: action as
                  | 'status'
                  | 'paymentStatus'
                  | 'fulfillmentStatus',
                previousValue,
                newValue: value,
                changedBy: auth.user.id,
                changedAt: new Date(),
                reason: 'Bulk update',
              })
            }
          }

          return successResponse({
            success: true,
            updatedCount: ids.length,
          })
        } catch (error) {
          return errorResponse('Failed to bulk update orders', error)
        }
      },
    },
  },
})
