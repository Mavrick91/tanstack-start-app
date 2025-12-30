import { createFileRoute } from '@tanstack/react-router'
import { asc, eq } from 'drizzle-orm'

import { db } from '../../../db'
import {
  productImages,
  productOptions,
  products,
  productVariants,
} from '../../../db/schema'
import {
  errorResponse,
  requireAdmin,
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
            .orderBy(asc(productImages.position))

          const options = await db
            .select()
            .from(productOptions)
            .where(eq(productOptions.productId, params.productId))
            .orderBy(asc(productOptions.position))

          const variants = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.productId, params.productId))
            .orderBy(asc(productVariants.position))

          return successResponse({
            product: { ...product, images, options, variants },
          })
        } catch (error) {
          return errorResponse('Failed to fetch product', error)
        }
      },

      PUT: async ({ params, request }) => {
        try {
          const auth = await requireAdmin(request)
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
            options,
            variants,
          } = body

          // Update product
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

          // Update options if provided
          if (options) {
            await db
              .delete(productOptions)
              .where(eq(productOptions.productId, params.productId))

            if (options.length > 0) {
              await db.insert(productOptions).values(
                options.map(
                  (opt: { name: string; values: string[] }, index: number) => ({
                    productId: params.productId,
                    name: opt.name,
                    values: opt.values,
                    position: index,
                  }),
                ),
              )
            }
          }

          // Update variants if provided
          if (variants) {
            await db
              .delete(productVariants)
              .where(eq(productVariants.productId, params.productId))

            if (variants.length > 0) {
              await db.insert(productVariants).values(
                variants.map(
                  (
                    v: {
                      title?: string
                      selectedOptions?: { name: string; value: string }[]
                      price: string
                      compareAtPrice?: string
                      sku?: string
                      barcode?: string
                      weight?: string
                      available?: boolean
                    },
                    index: number,
                  ) => ({
                    productId: params.productId,
                    title: v.title || 'Default Title',
                    selectedOptions: v.selectedOptions || [],
                    price: v.price,
                    compareAtPrice: v.compareAtPrice || null,
                    sku: v.sku || null,
                    barcode: v.barcode || null,
                    weight: v.weight || null,
                    inventoryPolicy: 'continue' as const,
                    available: v.available !== false ? 1 : 0,
                    position: index,
                  }),
                ),
              )
            }
          }

          // Fetch updated data
          const updatedOptions = await db
            .select()
            .from(productOptions)
            .where(eq(productOptions.productId, params.productId))
            .orderBy(asc(productOptions.position))

          const updatedVariants = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.productId, params.productId))
            .orderBy(asc(productVariants.position))

          return successResponse({
            product: {
              ...updated,
              options: updatedOptions,
              variants: updatedVariants,
            },
          })
        } catch (error) {
          return errorResponse('Failed to update product', error)
        }
      },

      DELETE: async ({ params, request }) => {
        try {
          const auth = await requireAdmin(request)
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
