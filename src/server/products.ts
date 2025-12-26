import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'

import { db } from '../db'
import { products, productImages } from '../db/schema'
import { validateSession } from '../lib/auth'

type LocalizedString = { en: string; fr?: string; id?: string }

export interface ProductInput {
  name: LocalizedString
  handle: string
  description?: LocalizedString
  vendor?: string
  productType?: string
  status?: 'draft' | 'active' | 'archived'
  tags?: string[]
  metaTitle?: LocalizedString
  metaDescription?: LocalizedString
  price?: string
  compareAtPrice?: string
  sku?: string
  barcode?: string
  inventoryQuantity?: number
  weight?: string
  images?: { url: string; altText?: LocalizedString }[]
}

export const getProductsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))

    return { success: true, data: allProducts }
  },
)

export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: ProductInput) => d)
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const {
      name,
      handle,
      description,
      vendor,
      productType,
      status,
      tags,
      metaTitle,
      metaDescription,
      price,
      compareAtPrice,
      sku,
      barcode,
      inventoryQuantity,
      weight,
      images,
    } = data

    if (
      !name ||
      typeof name !== 'object' ||
      !('en' in name) ||
      typeof name.en !== 'string' ||
      !name.en.trim()
    ) {
      throw new Error('Name must be an object with a non-empty "en" property')
    }

    if (!handle || typeof handle !== 'string' || !handle.trim()) {
      throw new Error('Handle is required')
    }

    const product = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          name,
          handle: handle.trim(),
          description,
          vendor,
          productType,
          status: status || 'draft',
          tags: tags || [],
          metaTitle,
          metaDescription,
          // Pricing & Inventory (now on product directly)
          price,
          compareAtPrice,
          sku: sku?.trim() || null,
          barcode: barcode?.trim() || null,
          inventoryQuantity: inventoryQuantity || 0,
          weight,
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

    return { success: true, data: product }
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const images = await db
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, data.productId))

    if (images.length > 0) {
      const { deleteImagesFromCloudinary } = await import('../lib/cloudinary')
      await deleteImagesFromCloudinary(images.map((img) => img.url))
    }

    await db.delete(products).where(eq(products.id, data.productId))
    return { success: true }
  })

export const duplicateProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const [original] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))

    if (!original) throw new Error('Product not found')

    const originalImages = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, data.productId))

    const [newProduct] = await db
      .insert(products)
      .values({
        ...original,
        id: undefined,
        handle: `${original.handle}-copy-${Date.now()}`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (originalImages.length > 0) {
      await db.insert(productImages).values(
        originalImages.map((img) => ({
          productId: newProduct.id,
          url: img.url,
          altText: img.altText,
          position: img.position,
        })),
      )
    }

    return { success: true, data: newProduct }
  })

export const updateProductStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { productId: string; status: 'draft' | 'active' | 'archived' }) => d,
  )
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    await db
      .update(products)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(products.id, data.productId))

    return { success: true }
  })
