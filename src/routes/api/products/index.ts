import { createFileRoute } from '@tanstack/react-router'
import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm'

import { db } from '../../../db'
import { productImages, products } from '../../../db/schema'
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
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const url = new URL(request.url)
          const page = Math.max(
            1,
            parseInt(url.searchParams.get('page') || '1', 10),
          )
          const limit = Math.min(
            100,
            Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)),
          )
          const search = url.searchParams.get('q') || ''
          const status = url.searchParams.get('status') as
            | 'active'
            | 'draft'
            | 'archived'
            | null
          const sortKey = url.searchParams.get('sort') || 'createdAt'
          const sortOrder =
            url.searchParams.get('order') === 'asc' ? 'asc' : 'desc'

          const conditions: SQL[] = []
          if (status && ['active', 'draft', 'archived'].includes(status)) {
            conditions.push(eq(products.status, status))
          }
          if (search) {
            conditions.push(
              or(
                ilike(products.handle, `%${search}%`),
                ilike(products.sku, `%${search}%`),
              ) as SQL,
            )
          }

          const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined

          const sortColumn =
            {
              name: products.name,
              price: products.price,
              inventory: products.inventoryQuantity,
              status: products.status,
              createdAt: products.createdAt,
            }[sortKey] || products.createdAt

          const orderBy =
            sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

          const [{ total }] = await db
            .select({ total: count() })
            .from(products)
            .where(whereClause)

          const offset = (page - 1) * limit
          const paginatedProducts = await db
            .select()
            .from(products)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)

          const productIds = paginatedProducts.map((p) => p.id)
          const images =
            productIds.length > 0
              ? await db
                  .select()
                  .from(productImages)
                  .orderBy(asc(productImages.position))
              : []

          const imagesByProductId = new Map<string, string>()
          for (const img of images) {
            if (!imagesByProductId.has(img.productId)) {
              imagesByProductId.set(img.productId, img.url)
            }
          }

          const productsWithImages = paginatedProducts.map((product) => ({
            ...product,
            firstImageUrl: imagesByProductId.get(product.id) || null,
          }))

          return successResponse({
            products: productsWithImages,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          })
        } catch (error) {
          return errorResponse('Failed to fetch products', error)
        }
      },

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

          if (
            !name ||
            typeof name !== 'object' ||
            !('en' in name) ||
            !(name as LocalizedString).en?.trim()
          ) {
            return simpleErrorResponse(
              'Name must be an object with a non-empty "en" property',
            )
          }

          if (!handle?.trim()) {
            return simpleErrorResponse('Handle is required')
          }

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
                ...sanitizeProductFields(body),
              })
              .returning()

            if (images?.length) {
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
