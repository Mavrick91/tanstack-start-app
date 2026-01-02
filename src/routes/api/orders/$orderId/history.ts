import { createFileRoute } from '@tanstack/react-router'

import {
  errorResponse,
  requireAdmin,
  successResponse,
} from '../../../../lib/api'
import { getOrderAuditTrail } from '../../../../server/orders'

export const Route = createFileRoute('/api/orders/$orderId/history')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const auth = await requireAdmin(request)
          if (!auth.success) return auth.response

          const { orderId } = params

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

          return successResponse({ history })
        } catch (error) {
          return errorResponse('Failed to fetch order history', error)
        }
      },
    },
  },
})
