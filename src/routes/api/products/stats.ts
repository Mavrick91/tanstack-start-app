import { createFileRoute } from '@tanstack/react-router'
import { count, eq } from 'drizzle-orm'

import { db } from '../../../db'
import { products } from '../../../db/schema'
import { requireAuth, successResponse } from '../../../lib/api'

export const Route = createFileRoute('/api/products/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          // Fetch aggregate stats across ALL products
          const [totalProductsResult] = await db
            .select({ count: count() })
            .from(products)

          const [activeCountResult] = await db
            .select({ count: count() })
            .from(products)
            .where(eq(products.status, 'active'))

          const [draftCountResult] = await db
            .select({ count: count() })
            .from(products)
            .where(eq(products.status, 'draft'))

          const [archivedCountResult] = await db
            .select({ count: count() })
            .from(products)
            .where(eq(products.status, 'archived'))

          return successResponse({
            totalProducts: totalProductsResult.count,
            activeCount: activeCountResult.count,
            draftCount: draftCountResult.count,
            archivedCount: archivedCountResult.count,
          })
        } catch (error) {
          console.error('Failed to fetch product stats:', error)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch stats' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
