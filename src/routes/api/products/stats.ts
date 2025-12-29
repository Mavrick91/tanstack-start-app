import { createFileRoute } from '@tanstack/react-router'
import { asc, count, eq } from 'drizzle-orm'

import { db } from '../../../db'
import { products, productVariants } from '../../../db/schema'
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

          // Low stock: products where their first variant has inventory < 5
          const allProductVariants = await db
            .select({
              productId: productVariants.productId,
              inventoryQuantity: productVariants.inventoryQuantity,
              position: productVariants.position,
            })
            .from(productVariants)
            .orderBy(asc(productVariants.position))

          // Get first variant per product and count low stock
          const firstVariantInventory = new Map<string, number>()
          for (const v of allProductVariants) {
            if (!firstVariantInventory.has(v.productId)) {
              firstVariantInventory.set(v.productId, v.inventoryQuantity)
            }
          }
          const lowStockCount = Array.from(
            firstVariantInventory.values(),
          ).filter((qty) => qty < 5).length

          return successResponse({
            totalProducts: totalProductsResult.count,
            activeCount: activeCountResult.count,
            draftCount: draftCountResult.count,
            archivedCount: archivedCountResult.count,
            lowStockCount,
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
