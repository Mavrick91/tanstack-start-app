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
      // GET /api/products/:productId - Get single product with all relations
      GET: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const { productId } = params

          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, productId))

          if (!product) {
            return simpleErrorResponse('Product not found', 404)
          }

          const images = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, productId))
            .orderBy(productImages.position)

          return successResponse({ product: { ...product, images } })
        } catch (error) {
          return errorResponse('Failed to fetch product', error)
        }
      },

      // PUT /api/products/:productId - Update product
      PUT: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const { productId } = params
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

          const sanitized = sanitizeProductFields(body)

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
              ...sanitized,
              updatedAt: new Date(),
            })
            .where(eq(products.id, productId))
            .returning()

          if (!updated) {
            return simpleErrorResponse('Product not found', 404)
          }

          return successResponse({ product: updated })
        } catch (error) {
          return errorResponse('Failed to update product', error)
        }
      },

      // DELETE /api/products/:productId - Delete product
      DELETE: async ({ params, request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const { productId } = params

          const [deleted] = await db
            .delete(products)
            .where(eq(products.id, productId))
            .returning()

          if (!deleted) {
            return simpleErrorResponse('Product not found', 404)
          }

          return successResponse({})
        } catch (error) {
          return errorResponse('Failed to delete product', error)
        }
      },
    },
  },
})
