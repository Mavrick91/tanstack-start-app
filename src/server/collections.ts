/**
 * Collections Server Functions
 *
 * Uses standardized patterns:
 * - Middleware for authentication (adminMiddleware)
 * - Top-level imports for database
 * - Error helpers for consistent responses
 */

import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from 'drizzle-orm'

import { db } from '../db'
import { adminMiddleware, throwNotFound } from './middleware'
import {
  collectionProducts,
  collections,
  productImages,
  products,
} from '../db/schema'
import {
  addProductsToCollectionSchema,
  bulkCollectionIdsSchema,
  bulkCollectionStatusSchema,
  collectionIdSchema,
  collectionInputSchema,
  collectionsStateSchema,
  removeProductFromCollectionSchema,
  reorderCollectionProductsSchema,
  updateCollectionSchema,
  type CollectionInput,
  type CollectionsState,
} from './schemas/collections'

// Re-export types for backwards compatibility
export type { CollectionInput, CollectionsState }

export const getCollectionsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionsStateSchema.parse(data))
  .handler(async ({ data }) => {
    const page = Math.max(1, data.page || 1)
    const limit = Math.min(100, Math.max(1, data.limit || 10))
    const offset = (page - 1) * limit

    const conditions = []

    if (data.status && data.status !== 'all') {
      conditions.push(
        data.status === 'active'
          ? isNotNull(collections.publishedAt)
          : isNull(collections.publishedAt),
      )
    }

    if (data.search) {
      conditions.push(
        or(
          ilike(collections.handle, `%${data.search}%`),
          sql`(${collections.name}->>'en') ILIKE ${`%${data.search}%`}`,
        ),
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Determine sort
    let orderBy
    if (data.sortKey === 'name') {
      orderBy =
        data.sortOrder === 'asc'
          ? asc(collections.name)
          : desc(collections.name)
    } else if (data.sortKey === 'productCount') {
      // Sorting by computed column is tricky in simple select,
      // but we can sort by logical subquery or just default to createdAt if complex
      // For now, let's keep it simple and default to createdAt if specific logic needed
      orderBy =
        data.sortOrder === 'asc'
          ? asc(collections.createdAt)
          : desc(collections.createdAt)
    } else {
      orderBy =
        data.sortOrder === 'asc'
          ? asc(collections.createdAt)
          : desc(collections.createdAt)
    }

    // Get Total
    const [{ total }] = await db
      .select({ total: count() })
      .from(collections)
      .where(whereClause)

    const result = await db
      .select({
        id: collections.id,
        handle: collections.handle,
        name: collections.name,

        sortOrder: collections.sortOrder,
        publishedAt: collections.publishedAt,
        createdAt: collections.createdAt,
        productCount: sql<number>`(
          SELECT COUNT(*) FROM collection_products
          WHERE collection_id = ${collections.id}
        )::int`,
        previewImages: sql<string[]>`(
          SELECT COALESCE(json_agg(url), '[]'::json)
          FROM (
            SELECT pi.url
            FROM ${collectionProducts} cp
            CROSS JOIN LATERAL (
              SELECT url
              FROM ${productImages} pi
              WHERE pi.product_id = cp.product_id
              ORDER BY pi.position ASC
              LIMIT 1
            ) pi
            WHERE cp.collection_id = collections.id
            ORDER BY cp.position ASC
            LIMIT 4
          ) as sub
        )`.mapWith((val) => val as string[]),
      })
      .from(collections)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Handle productCount sorting in memory if needed (since it's a computed column in select)
    // Or better, wrapping the query. For now, in-memory sort for productCount if page size is small
    if (data.sortKey === 'productCount') {
      result.sort((a, b) => {
        const diff = a.productCount - b.productCount
        return data.sortOrder === 'asc' ? diff : -diff
      })
    }

    return {
      success: true,
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })

export const bulkDeleteCollectionsFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => bulkCollectionIdsSchema.parse(data))
  .handler(async ({ data }) => {
    if (!data.ids.length) return { success: true, count: 0 }

    const res = await db
      .delete(collections)
      .where(inArray(collections.id, data.ids))
      .returning()

    return { success: true, count: res.length }
  })

export const bulkUpdateCollectionsStatusFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => bulkCollectionStatusSchema.parse(data))
  .handler(async ({ data }) => {
    if (!data.ids.length) return { success: true, count: 0 }

    const updateData = {
      publishedAt: data.action === 'publish' ? new Date() : null,
    }

    const res = await db
      .update(collections)
      .set(updateData)
      .where(inArray(collections.id, data.ids))
      .returning()

    return { success: true, count: res.length }
  })

export const getCollectionFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.id))

    if (!collection) {
      throwNotFound('Collection')
    }

    const collectionProductsList = await db
      .select({
        product: products,
        position: collectionProducts.position,
      })
      .from(collectionProducts)
      .innerJoin(products, eq(collectionProducts.productId, products.id))
      .where(eq(collectionProducts.collectionId, data.id))
      .orderBy(asc(collectionProducts.position))

    // Batch fetch images to avoid N+1 queries
    const productIds = collectionProductsList.map(({ product }) => product.id)
    const firstImageByProduct = new Map()

    if (productIds.length > 0) {
      const allImages = await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.position))

      // Get first image for each product
      for (const img of allImages) {
        if (!firstImageByProduct.has(img.productId)) {
          firstImageByProduct.set(img.productId, img.url)
        }
      }
    }

    const productsWithImages = collectionProductsList.map(
      ({ product, position }) => ({
        ...product,
        position,
        image: firstImageByProduct.get(product.id) || null,
      }),
    )

    return {
      success: true,
      data: { ...collection, products: productsWithImages },
    }
  })

export const createCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { name, handle, description, sortOrder, metaTitle, metaDescription } =
      data

    // Zod validates required fields, just trim handle for insert
    const [collection] = await db
      .insert(collections)
      .values({
        name,
        handle: handle.trim().toLowerCase().replace(/\s+/g, '-'),
        description,
        sortOrder: sortOrder || 'manual',
        metaTitle,
        metaDescription,
      })
      .returning()

    return { success: true, data: collection }
  })

export const updateCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => updateCollectionSchema.parse(data))
  .handler(async ({ data }) => {
    const { id, ...updates } = data

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(eq(collections.id, id))
      .returning()

    if (!updated) {
      throwNotFound('Collection')
    }

    return { success: true, data: updated }
  })

export const deleteCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [deleted] = await db
      .delete(collections)
      .where(eq(collections.id, data.id))
      .returning()

    if (!deleted) {
      throwNotFound('Collection')
    }

    return { success: true }
  })

export const addProductsToCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => addProductsToCollectionSchema.parse(data))
  .handler(async ({ data }) => {
    const { collectionId, productIds } = data

    if (!productIds.length) return { success: true }

    // Get current max position
    const [maxPos] = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, collectionId))

    const startPosition = (maxPos?.max ?? -1) + 1

    // Filter out products already in collection
    const existing = await db
      .select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collectionId),
          inArray(collectionProducts.productId, productIds),
        ),
      )

    const existingIds = new Set(existing.map((e) => e.productId))
    const newProductIds = productIds.filter((id) => !existingIds.has(id))

    if (newProductIds.length) {
      await db.insert(collectionProducts).values(
        newProductIds.map((productId, index) => ({
          collectionId,
          productId,
          position: startPosition + index,
        })),
      )
    }

    return { success: true, added: newProductIds.length }
  })

export const removeProductFromCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    removeProductFromCollectionSchema.parse(data),
  )
  .handler(async ({ data }) => {
    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, data.collectionId),
          eq(collectionProducts.productId, data.productId),
        ),
      )

    return { success: true }
  })

export const reorderCollectionProductsFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    reorderCollectionProductsSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { collectionId, productIds } = data

    // Update positions in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < productIds.length; i++) {
        await tx
          .update(collectionProducts)
          .set({ position: i })
          .where(
            and(
              eq(collectionProducts.collectionId, collectionId),
              eq(collectionProducts.productId, productIds[i]),
            ),
          )
      }
    })

    return { success: true }
  })

export const publishCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(collections)
      .set({ publishedAt: new Date() })
      .where(eq(collections.id, data.id))
      .returning()

    if (!updated) {
      throwNotFound('Collection')
    }

    return { success: true, data: updated }
  })

export const unpublishCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(collections)
      .set({ publishedAt: null })
      .where(eq(collections.id, data.id))
      .returning()

    if (!updated) {
      throwNotFound('Collection')
    }

    return { success: true, data: updated }
  })

export const getCollectionStatsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const [
      totalResult,
      activeResult,
      draftResult,
      productsInCollectionsResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(collections),
      db
        .select({ count: count() })
        .from(collections)
        .where(isNotNull(collections.publishedAt)),
      db
        .select({ count: count() })
        .from(collections)
        .where(isNull(collections.publishedAt)),
      db.select({ count: count() }).from(collectionProducts),
    ])

    return {
      success: true,
      stats: {
        total: totalResult[0].count,
        active: activeResult[0].count,
        draft: draftResult[0].count,
        productsInCollections: productsInCollectionsResult[0].count,
      },
    }
  })

export const duplicateCollectionFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => collectionIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [original] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.id))

    if (!original) {
      throwNotFound('Collection')
    }

    // Generate unique handle
    const baseHandle = `${original.handle}-copy`
    let handle = baseHandle
    let suffix = 1

    for (;;) {
      const [existing] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.handle, handle))

      if (!existing) break
      handle = `${baseHandle}-${suffix++}`
    }

    // Create duplicate
    const [duplicated] = await db
      .insert(collections)
      .values({
        name: original.name,
        handle,
        description: original.description,
        sortOrder: original.sortOrder,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        publishedAt: null, // Duplicates start unpublished
      })
      .returning()

    // Copy products
    const originalProducts = await db
      .select()
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, data.id))

    if (originalProducts.length > 0) {
      await db.insert(collectionProducts).values(
        originalProducts.map((p) => ({
          collectionId: duplicated.id,
          productId: p.productId,
          position: p.position,
        })),
      )
    }

    return { success: true, data: duplicated }
  })
