import { createFileRoute } from '@tanstack/react-router'
import { desc } from 'drizzle-orm'

import { db } from '../../../db'
import { products, productImages } from '../../../db/schema'
import {
  errorResponse,
  requireAuth,
  sanitizeProductFields,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'

type LocalizedString = { en: string; fr?: string; id?: string }

export const Route = createFileRoute('/api/products/')({
  server: {
    handlers: {
      // GET /api/products - List all products
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const allProducts = await db
            .select()
            .from(products)
            .orderBy(desc(products.createdAt))

          return successResponse({ products: allProducts })
        } catch (error) {
          return errorResponse('Failed to fetch products', error)
        }
      },

      // POST /api/products - Create product
      POST: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const body = await request.json()
          const {
            name,
            handle,
            description,
            status,
            tags,
            metaTitle,
            metaDescription,
            images,
          } = body

          // Validate required fields
          if (
            !name ||
            typeof name !== 'object' ||
            !('en' in name) ||
            typeof (name as LocalizedString).en !== 'string' ||
            !(name as LocalizedString).en.trim()
          ) {
            return simpleErrorResponse(
              'Name must be an object with a non-empty "en" property',
            )
          }

          if (!handle || typeof handle !== 'string' || !handle.trim()) {
            return simpleErrorResponse('Handle is required')
          }

          const sanitized = sanitizeProductFields(body)

          const product = await db.transaction(async (tx) => {
            const [newProduct] = await tx
              .insert(products)
              .values({
                name,
                handle: handle.trim(),
                description,
                status: status || 'draft',
                tags: tags || [],
                metaTitle,
                metaDescription,
                ...sanitized,
              })
              .returning()

            if (Array.isArray(images) && images.length > 0) {
              await tx.insert(productImages).values(
                images.map(
                  (
                    img: { url: string; altText?: LocalizedString },
                    index: number,
                  ) => ({
                    productId: newProduct.id,
                    url: img.url,
                    altText: img.altText,
                    position: index,
                  }),
                ),
              )
            }

            return newProduct
          })

          return successResponse({ product }, 201)
        } catch (error) {
          return errorResponse('Failed to create product', error)
        }
      },
    },
  },
})
