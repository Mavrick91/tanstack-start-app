/**
 * Products Server Functions
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
  type SQL,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { adminMiddleware, throwBadRequest, throwNotFound } from './middleware'
import {
  productImages,
  productOptions,
  products,
  productVariants,
} from '../db/schema'
import { emptyToNull } from '../lib/api'
import {
  productIdSchema,
  productInputSchema,
  updateProductStatusSchema,
  type ProductInput,
  type ProductOptionInput,
  type ProductVariantInput,
} from './schemas/products'

type SelectedOption = { name: string; value: string }

// Re-export types for backwards compatibility
export type { ProductInput, ProductOptionInput, ProductVariantInput }

// Helper: Generate all variant combinations from options
export const generateVariantCombinations = (
  options: ProductOptionInput[],
): SelectedOption[][] => {
  if (options.length === 0) return [[]]

  const [first, ...rest] = options
  const restCombinations: SelectedOption[][] = generateVariantCombinations(rest)

  return first.values.flatMap((value: string) =>
    restCombinations.map((combo: SelectedOption[]) => [
      { name: first.name, value },
      ...combo,
    ]),
  )
}

export const getProductsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))

    if (allProducts.length === 0) {
      return { success: true, data: [] }
    }

    const productIds = allProducts.map((p) => p.id)

    const [allImages, allVariants, allOptions] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.position)),
      db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .orderBy(asc(productVariants.position)),
      db
        .select()
        .from(productOptions)
        .where(inArray(productOptions.productId, productIds))
        .orderBy(asc(productOptions.position)),
    ])

    const imagesByProduct = new Map<string, (typeof allImages)[0][]>()
    for (const img of allImages) {
      if (!imagesByProduct.has(img.productId)) {
        imagesByProduct.set(img.productId, [])
      }
      imagesByProduct.get(img.productId)!.push(img)
    }

    const variantsByProduct = new Map<string, (typeof allVariants)[0][]>()
    for (const v of allVariants) {
      if (!variantsByProduct.has(v.productId)) {
        variantsByProduct.set(v.productId, [])
      }
      variantsByProduct.get(v.productId)!.push(v)
    }

    const optionsByProduct = new Map<string, (typeof allOptions)[0][]>()
    for (const opt of allOptions) {
      if (!optionsByProduct.has(opt.productId)) {
        optionsByProduct.set(opt.productId, [])
      }
      optionsByProduct.get(opt.productId)!.push(opt)
    }

    const productsWithData = allProducts.map((product) => {
      const images = imagesByProduct.get(product.id) || []
      const variants = variantsByProduct.get(product.id) || []
      const options = optionsByProduct.get(product.id) || []
      const firstVariant = variants[0]

      return {
        ...product,
        image: images[0]?.url || null,
        price: firstVariant?.price || null,
        variants,
        options,
      }
    })

    return { success: true, data: productsWithData }
  })

export const createProductFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => productInputSchema.parse(data))
  .handler(async ({ data }) => {
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

    const trimmedHandle = handle.trim()

    const product = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          name,
          handle: trimmedHandle,
          description,
          vendor: emptyToNull(vendor),
          productType: emptyToNull(productType),
          status: status || 'draft',
          tags: tags || [],
          metaTitle,
          metaDescription,
        })
        .returning()

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

      if (inputVariants && inputVariants.length > 0) {
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
            available: v.available !== false ? 1 : 0,
            position: index,
          })),
        )
      } else if (options.length > 0) {
        const combinations = generateVariantCombinations(options)
        await tx.insert(productVariants).values(
          combinations.map((combo: SelectedOption[], index: number) => ({
            productId: newProduct.id,
            title: combo.map((o: SelectedOption) => o.value).join(' / '),
            selectedOptions: combo,
            price: price || '0',
            compareAtPrice: emptyToNull(compareAtPrice),
            available: 1,
            position: index,
          })),
        )
      } else {
        await tx.insert(productVariants).values({
          productId: newProduct.id,
          title: 'Default Title',
          selectedOptions: [],
          price: price || '0',
          compareAtPrice: emptyToNull(compareAtPrice),
          available: 1,
          position: 0,
        })
      }

      if (Array.isArray(images) && images.length > 0) {
        await tx.insert(productImages).values(
          images.map((img, index) => ({
            productId: newProduct.id,
            url: img.url,
            altText: img.altText ?? undefined,
            position: index,
          })),
        )
      }

      return newProduct
    })

    return { success: true, data: product }
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => productIdSchema.parse(data))
  .handler(async ({ data }) => {
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
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => productIdSchema.parse(data))
  .handler(async ({ data }) => {
    const [original] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))

    if (!original) {
      return throwNotFound('Product')
    }

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
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) => updateProductStatusSchema.parse(data))
  .handler(async ({ data }) => {
    await db
      .update(products)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(products.id, data.productId))

    return { success: true }
  })

export const getAdminProductsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async () => {
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))

    if (allProducts.length === 0) {
      return []
    }

    const productIds = allProducts.map((p) => p.id)

    const [allImages, allVariants] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.position)),
      db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .orderBy(asc(productVariants.position)),
    ])

    const firstImageByProduct = new Map()
    for (const img of allImages) {
      if (!firstImageByProduct.has(img.productId)) {
        firstImageByProduct.set(img.productId, img.url)
      }
    }

    const variantsByProduct = new Map<string, (typeof allVariants)[0][]>()
    for (const v of allVariants) {
      if (!variantsByProduct.has(v.productId)) {
        variantsByProduct.set(v.productId, [])
      }
      variantsByProduct.get(v.productId)!.push(v)
    }

    const productsWithData = allProducts.map((product) => {
      const variants = variantsByProduct.get(product.id) || []
      const prices = variants
        .map((v) => parseFloat(v.price))
        .filter((p) => !isNaN(p))
      const minPrice = prices.length > 0 ? Math.min(...prices) : null
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null

      return {
        ...product,
        imageUrl: firstImageByProduct.get(product.id),
        variantCount: variants.length,
        minPrice,
        maxPrice,
        price: variants[0]?.price ?? '0',
      }
    })

    return productsWithData
  })

export const getProductStatsFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async () => {
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

    return {
      totalProducts: totalProductsResult.count,
      activeCount: activeCountResult.count,
      draftCount: draftCountResult.count,
      archivedCount: archivedCountResult.count,
    }
  })

export const deleteProductsBulkFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()) }).parse(data),
  )
  .handler(async ({ data }) => {
    await db.delete(products).where(inArray(products.id, data.ids))
    return { success: true, deletedCount: data.ids.length }
  })

export const bulkUpdateProductsFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        action: z.enum(['delete', 'archive', 'activate']),
        ids: z.array(z.string().uuid()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { action, ids } = data

    if (ids.length === 0) {
      return throwBadRequest('No items selected')
    }

    if (action === 'delete') {
      const images = await db
        .select({ url: productImages.url })
        .from(productImages)
        .where(inArray(productImages.productId, ids))

      if (images.length > 0) {
        const { deleteImagesFromCloudinary } = await import('../lib/cloudinary')
        await deleteImagesFromCloudinary(images.map((img) => img.url))
      }

      await db.delete(products).where(inArray(products.id, ids))
    } else if (action === 'archive') {
      await db
        .update(products)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(inArray(products.id, ids))
    } else if (action === 'activate') {
      await db
        .update(products)
        .set({ status: 'active', updatedAt: new Date() })
        .where(inArray(products.id, ids))
    }

    return { success: true, count: ids.length }
  })

export const getProductByIdFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))

    if (!product) {
      return throwNotFound('Product')
    }

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, data.productId))
      .orderBy(asc(productImages.position))

    const options = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, data.productId))
      .orderBy(asc(productOptions.position))

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, data.productId))
      .orderBy(asc(productVariants.position))

    return {
      product: { ...product, images, options, variants },
    }
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        name: z
          .object({
            en: z.string(),
            fr: z.string().optional(),
            id: z.string().optional(),
          })
          .optional(),
        handle: z.string().optional(),
        description: z
          .object({
            en: z.string(),
            fr: z.string().optional(),
            id: z.string().optional(),
          })
          .optional()
          .nullable(),
        status: z.enum(['draft', 'active', 'archived']).optional(),
        vendor: z.string().optional().nullable(),
        productType: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        metaTitle: z
          .object({
            en: z.string(),
            fr: z.string().optional(),
            id: z.string().optional(),
          })
          .optional()
          .nullable(),
        metaDescription: z
          .object({
            en: z.string(),
            fr: z.string().optional(),
            id: z.string().optional(),
          })
          .optional()
          .nullable(),
        options: z
          .array(z.object({ name: z.string(), values: z.array(z.string()) }))
          .optional(),
        variants: z
          .array(
            z.object({
              title: z.string().optional(),
              selectedOptions: z
                .array(z.object({ name: z.string(), value: z.string() }))
                .optional(),
              price: z.string(),
              compareAtPrice: z.string().optional().nullable(),
              sku: z.string().optional().nullable(),
              barcode: z.string().optional().nullable(),
              weight: z.string().optional().nullable(),
              available: z.boolean().optional(),
            }),
          )
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const {
      productId,
      name,
      description,
      handle,
      status,
      vendor,
      productType,
      tags,
      metaTitle,
      metaDescription,
      options,
      variants,
    } = data

    return await db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (handle !== undefined) updateData.handle = handle
      if (status !== undefined) updateData.status = status
      if (vendor !== undefined) updateData.vendor = emptyToNull(vendor)
      if (productType !== undefined)
        updateData.productType = emptyToNull(productType)
      if (tags !== undefined) updateData.tags = tags
      if (metaTitle !== undefined) updateData.metaTitle = metaTitle
      if (metaDescription !== undefined)
        updateData.metaDescription = metaDescription

      const [updated] = await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning()

      if (!updated) {
        return throwNotFound('Product')
      }

      if (options !== undefined) {
        await tx
          .delete(productOptions)
          .where(eq(productOptions.productId, productId))

        if (options.length > 0) {
          await tx.insert(productOptions).values(
            options.map((opt, index) => ({
              productId,
              name: opt.name,
              values: opt.values,
              position: index,
            })),
          )
        }
      }

      if (variants !== undefined) {
        await tx
          .delete(productVariants)
          .where(eq(productVariants.productId, productId))

        if (variants.length > 0) {
          await tx.insert(productVariants).values(
            variants.map((v, index) => ({
              productId,
              title: v.title || 'Default Title',
              selectedOptions: v.selectedOptions || [],
              price: v.price,
              compareAtPrice: emptyToNull(v.compareAtPrice),
              sku: emptyToNull(v.sku),
              barcode: emptyToNull(v.barcode),
              weight: emptyToNull(v.weight),
              available: v.available !== false ? 1 : 0,
              position: index,
            })),
          )
        }
      }

      const updatedOptions = await tx
        .select()
        .from(productOptions)
        .where(eq(productOptions.productId, productId))
        .orderBy(asc(productOptions.position))

      const updatedVariants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(asc(productVariants.position))

      return {
        product: {
          ...updated,
          options: updatedOptions,
          variants: updatedVariants,
        },
      }
    })
  })

export const updateProductImagesFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        images: z.array(
          z.object({
            url: z.string(),
            altText: z
              .object({
                en: z.string(),
                fr: z.string().optional(),
                id: z.string().optional(),
              })
              .optional(),
            position: z.number(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { productId, images } = data

    const existingImages = await db
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, productId))

    const existingUrls = new Set(existingImages.map((i) => i.url))
    const newUrls = new Set(images.map((i) => i.url))

    const removedUrls = [...existingUrls].filter((url) => !newUrls.has(url))
    if (removedUrls.length > 0) {
      const { deleteImagesFromCloudinary } = await import('../lib/cloudinary')
      await deleteImagesFromCloudinary(removedUrls)
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(productImages)
        .where(eq(productImages.productId, productId))

      if (images.length > 0) {
        await tx.insert(productImages).values(
          images.map((img) => ({
            productId,
            url: img.url,
            altText: img.altText,
            position: img.position,
          })),
        )
      }
    })

    return { success: true }
  })

export const getProductsListFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['active', 'draft', 'archived', 'all']).optional(),
        sortKey: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { page, limit, search, status, sortKey, sortOrder } = data

    const conditions: SQL[] = []
    if (status && status !== 'all') {
      conditions.push(eq(products.status, status))
    }
    if (search) {
      conditions.push(ilike(products.handle, `%${search}%`) as SQL)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const sortColumn =
      {
        name: products.name,
        status: products.status,
        createdAt: products.createdAt,
      }[sortKey || 'createdAt'] || products.createdAt

    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

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

    const imagesByProductId = new Map()
    for (const img of images) {
      if (!imagesByProductId.has(img.productId)) {
        imagesByProductId.set(img.productId, img.url)
      }
    }

    const allVariants =
      productIds.length > 0
        ? await db
            .select()
            .from(productVariants)
            .orderBy(asc(productVariants.position))
        : []

    const variantsByProductId = new Map<string, (typeof allVariants)[0]>()
    for (const v of allVariants) {
      if (!variantsByProductId.has(v.productId)) {
        variantsByProductId.set(v.productId, v)
      }
    }

    const productsWithData = paginatedProducts.map((product) => {
      const firstVariant = variantsByProductId.get(product.id)
      return {
        ...product,
        firstImageUrl: imagesByProductId.get(product.id) || null,
        price: firstVariant?.price || null,
      }
    })

    return {
      products: productsWithData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })
