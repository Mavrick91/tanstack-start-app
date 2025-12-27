import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { asc, desc, eq } from 'drizzle-orm'

import { db } from '../db'
import {
  products,
  productImages,
  productOptions,
  productVariants,
} from '../db/schema'
import { emptyToNull } from '../lib/api'
import { validateSession } from '../lib/auth'

type LocalizedString = { en: string; fr?: string; id?: string }
type SelectedOption = { name: string; value: string }

// Option input for creating/updating product
export interface ProductOptionInput {
  name: string // e.g., "Shape"
  values: string[] // e.g., ["Coffin", "Almond"]
}

// Variant input (for explicit variant data)
export interface ProductVariantInput {
  title?: string
  selectedOptions?: SelectedOption[]
  price: string
  compareAtPrice?: string
  sku?: string
  barcode?: string
  weight?: string
  available?: boolean
}

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
  images?: { url: string; altText?: LocalizedString }[]
  // New: Options & Variants
  options?: ProductOptionInput[]
  variants?: ProductVariantInput[]
  // Legacy: single price (creates default variant)
  price?: string
  compareAtPrice?: string
}

// Helper: Generate all variant combinations from options
export function generateVariantCombinations(
  options: ProductOptionInput[],
): SelectedOption[][] {
  if (options.length === 0) return [[]]

  const [first, ...rest] = options
  const restCombinations = generateVariantCombinations(rest)

  return first.values.flatMap((value) =>
    restCombinations.map((combo) => [{ name: first.name, value }, ...combo]),
  )
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

    const productsWithData = await Promise.all(
      allProducts.map(async (product) => {
        // Get first image
        const images = await db
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .orderBy(asc(productImages.position))
          .limit(1)

        // Get variants (for price display)
        const variants = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, product.id))
          .orderBy(asc(productVariants.position))

        // Get options
        const options = await db
          .select()
          .from(productOptions)
          .where(eq(productOptions.productId, product.id))
          .orderBy(asc(productOptions.position))

        // Derive price from first variant
        const firstVariant = variants[0]

        return {
          ...product,
          image: images[0]?.url || null,
          price: firstVariant?.price || null,
          inventoryQuantity: variants.reduce(
            (sum, v) => sum + v.inventoryQuantity,
            0,
          ),
          variants,
          options,
        }
      }),
    )

    return { success: true, data: productsWithData }
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
      images,
      options = [],
      variants: inputVariants,
      price,
      compareAtPrice,
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
      // 1. Insert Product
      const [newProduct] = await tx
        .insert(products)
        .values({
          name,
          handle: handle.trim(),
          description,
          vendor: emptyToNull(vendor),
          productType: emptyToNull(productType),
          status: status || 'draft',
          tags: tags || [],
          metaTitle,
          metaDescription,
        })
        .returning()

      // 2. Insert Product Options
      if (options.length > 0) {
        await tx.insert(productOptions).values(
          options.map((opt, index) => ({
            productId: newProduct.id,
            name: opt.name,
            values: opt.values,
            position: index,
          })),
        )
      }

      // 3. Insert Variants
      if (inputVariants && inputVariants.length > 0) {
        // Explicit variants provided
        await tx.insert(productVariants).values(
          inputVariants.map((v, index) => ({
            productId: newProduct.id,
            title: v.title || 'Default Title',
            selectedOptions: v.selectedOptions || [],
            price: v.price,
            compareAtPrice: emptyToNull(v.compareAtPrice),
            sku: emptyToNull(v.sku),
            barcode: emptyToNull(v.barcode),
            weight: emptyToNull(v.weight),
            inventoryPolicy: 'continue' as const,
            available: v.available !== false ? 1 : 0,
            position: index,
          })),
        )
      } else if (options.length > 0) {
        // Auto-generate variants from options
        const combinations = generateVariantCombinations(options)
        await tx.insert(productVariants).values(
          combinations.map((combo, index) => ({
            productId: newProduct.id,
            title: combo.map((o) => o.value).join(' / '),
            selectedOptions: combo,
            price: price || '0',
            compareAtPrice: emptyToNull(compareAtPrice),
            inventoryPolicy: 'continue' as const,
            available: 1,
            position: index,
          })),
        )
      } else {
        // No options: Create default variant
        await tx.insert(productVariants).values({
          productId: newProduct.id,
          title: 'Default Title',
          selectedOptions: [],
          price: price || '0',
          compareAtPrice: emptyToNull(compareAtPrice),
          inventoryPolicy: 'continue' as const,
          available: 1,
          position: 0,
        })
      }

      // 4. Insert Images
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

    const originalOptions = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, data.productId))

    const originalVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, data.productId))

    const newProduct = await db.transaction(async (tx) => {
      const [created] = await tx
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

      if (originalOptions.length > 0) {
        await tx.insert(productOptions).values(
          originalOptions.map((opt) => ({
            productId: created.id,
            name: opt.name,
            values: opt.values,
            position: opt.position,
          })),
        )
      }

      if (originalVariants.length > 0) {
        await tx.insert(productVariants).values(
          originalVariants.map((v) => ({
            productId: created.id,
            title: v.title,
            selectedOptions: v.selectedOptions,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            sku: v.sku ? `${v.sku}-copy` : null,
            barcode: null,
            weight: v.weight,
            inventoryPolicy: v.inventoryPolicy,
            available: v.available,
            position: v.position,
          })),
        )
      }

      if (originalImages.length > 0) {
        await tx.insert(productImages).values(
          originalImages.map((img) => ({
            productId: created.id,
            url: img.url,
            altText: img.altText,
            position: img.position,
          })),
        )
      }

      return created
    })

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
