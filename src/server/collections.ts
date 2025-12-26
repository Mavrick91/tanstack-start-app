import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../db'
import {
  collectionProducts,
  collections,
  productImages,
  products,
} from '../db/schema'
import { validateSession } from '../lib/auth'

type LocalizedString = { en: string; fr?: string; id?: string }

export interface CollectionInput {
  name: LocalizedString
  handle: string
  description?: LocalizedString
  imageUrl?: string
  sortOrder?: 'manual' | 'best_selling' | 'newest' | 'price_asc' | 'price_desc'
  metaTitle?: LocalizedString
  metaDescription?: LocalizedString
}

async function requireAuth() {
  const request = getRequest()
  if (!request) throw new Error('No request found')
  const auth = await validateSession(request)
  if (!auth.success) throw new Error(auth.error || 'Unauthorized')
  return auth.user
}

export const getCollectionsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()

    const result = await db
      .select({
        id: collections.id,
        handle: collections.handle,
        name: collections.name,
        imageUrl: collections.imageUrl,
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
      .orderBy(desc(collections.createdAt))

    return { success: true, data: result }
  },
)

export const getCollectionFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.id))

    if (!collection) throw new Error('Collection not found')

    const collectionProductsList = await db
      .select({
        product: products,
        position: collectionProducts.position,
      })
      .from(collectionProducts)
      .innerJoin(products, eq(collectionProducts.productId, products.id))
      .where(eq(collectionProducts.collectionId, data.id))
      .orderBy(asc(collectionProducts.position))

    const productsWithImages = await Promise.all(
      collectionProductsList.map(async ({ product, position }) => {
        const images = await db
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .orderBy(asc(productImages.position))
          .limit(1)

        return {
          ...product,
          position,
          image: images[0]?.url || null,
        }
      }),
    )

    return {
      success: true,
      data: { ...collection, products: productsWithImages },
    }
  })

export const createCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: CollectionInput) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const {
      name,
      handle,
      description,
      imageUrl,
      sortOrder,
      metaTitle,
      metaDescription,
    } = data

    if (!name?.en?.trim()) {
      throw new Error('Name (English) is required')
    }
    if (!handle?.trim()) {
      throw new Error('Handle is required')
    }

    const [collection] = await db
      .insert(collections)
      .values({
        name,
        handle: handle.trim().toLowerCase().replace(/\s+/g, '-'),
        description,
        imageUrl,
        sortOrder: sortOrder || 'manual',
        metaTitle,
        metaDescription,
      })
      .returning()

    return { success: true, data: collection }
  })

export const updateCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string } & Partial<CollectionInput>) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const { id, ...updates } = data

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(eq(collections.id, id))
      .returning()

    if (!updated) throw new Error('Collection not found')

    return { success: true, data: updated }
  })

export const deleteCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const [deleted] = await db
      .delete(collections)
      .where(eq(collections.id, data.id))
      .returning()

    if (!deleted) throw new Error('Collection not found')

    return { success: true }
  })

export const addProductsToCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { collectionId: string; productIds: string[] }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

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
  .inputValidator((d: { collectionId: string; productId: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

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
  .inputValidator((d: { collectionId: string; productIds: string[] }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

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
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const [updated] = await db
      .update(collections)
      .set({ publishedAt: new Date() })
      .where(eq(collections.id, data.id))
      .returning()

    if (!updated) throw new Error('Collection not found')

    return { success: true, data: updated }
  })

export const unpublishCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const [updated] = await db
      .update(collections)
      .set({ publishedAt: null })
      .where(eq(collections.id, data.id))
      .returning()

    if (!updated) throw new Error('Collection not found')

    return { success: true, data: updated }
  })

export const duplicateCollectionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth()

    const [original] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.id))

    if (!original) throw new Error('Collection not found')

    // Generate unique handle
    const baseHandle = `${original.handle}-copy`
    let handle = baseHandle
    let suffix = 1

    while (true) {
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
        imageUrl: original.imageUrl,
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
