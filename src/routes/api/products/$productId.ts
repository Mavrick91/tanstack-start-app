import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { productImages, products } from '../../../db/schema'
import {
  errorResponse,
  requireAuth,
  sanitizeProductFields,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'

export const Route = createFileRoute('/api/products/$productId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, params.productId))

          if (!product) return simpleErrorResponse('Product not found', 404)

          const images = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, params.productId))
            .orderBy(productImages.position)

          return successResponse({ product: { ...product, images } })
        } catch (error) {
          return errorResponse('Failed to fetch product', error)
        }
      },

      PUT: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const body = await request.json()
          const {
            name,
            description,
            handle,
            status,
            tags,
            metaTitle,
            metaDescription,
          } = body

          const [updated] = await db
            .update(products)
            .set({
              name,
              description,
              handle,
              status,
              tags,
              metaTitle,
              metaDescription,
              ...sanitizeProductFields(body),
              updatedAt: new Date(),
            })
            .where(eq(products.id, params.productId))
            .returning()

          if (!updated) return simpleErrorResponse('Product not found', 404)

          return successResponse({ product: updated })
        } catch (error) {
          return errorResponse('Failed to update product', error)
        }
      },

      DELETE: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const [deleted] = await db
            .delete(products)
            .where(eq(products.id, params.productId))
            .returning()

          if (!deleted) return simpleErrorResponse('Product not found', 404)

          return successResponse({})
        } catch (error) {
          return errorResponse('Failed to delete product', error)
        }
      },
    },
  },
})
