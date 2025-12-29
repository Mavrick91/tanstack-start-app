import { createFileRoute } from '@tanstack/react-router'
import { and, count, eq, gte, sql } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { errorResponse, requireAuth, successResponse } from '../../../lib/api'

export const Route = createFileRoute('/api/orders/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          // Only admin can access order stats
          if (auth.user.role !== 'admin') {
            return new Response('Forbidden', { status: 403 })
          }

          // Get today's start (midnight)
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          // Run all queries in parallel
          const [
            pendingResult,
            unpaidResult,
            unfulfilledResult,
            revenueResult,
          ] = await Promise.all([
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
                and(
                  eq(orders.paymentStatus, 'paid'),
                  gte(orders.createdAt, today),
                ),
              ),
          ])

          return successResponse({
            stats: {
              pending: pendingResult[0]?.count ?? 0,
              unpaid: unpaidResult[0]?.count ?? 0,
              unfulfilled: unfulfilledResult[0]?.count ?? 0,
              todayRevenue: parseFloat(revenueResult[0]?.total ?? '0'),
              currency: 'USD', // Could be configurable
            },
          })
        } catch (error) {
          return errorResponse('Failed to fetch order stats', error)
        }
      },
    },
  },
})
