import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'

import { db } from '../db'
import { products, productVariants, productImages } from '../db/schema'
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

export async function getProductsLogic() {
  const request = getRequest()
  if (!request) throw new Error('No request found')

  const auth = await validateSession(request)
  if (!auth.success) {
    throw new Error(auth.error || 'Unauthorized')
  }

  const allProducts = await db
    .select({
      id: products.id,
      handle: products.handle,
      name: products.name,
      status: products.status,
      vendor: products.vendor,
      productType: products.productType,
      publishedAt: products.publishedAt,
      createdAt: products.createdAt,
    })
    .from(products)
    .orderBy(desc(products.createdAt))

  const productsWithMeta = await Promise.all(
    allProducts.map(async (product) => {
      const variants = await db
        .select({
          price: productVariants.price,
          inventoryQuantity: productVariants.inventoryQuantity,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))

      const prices = variants
        .map((v) => Number(v.price))
        .filter((p) => !isNaN(p))

      const totalInventory = variants.reduce(
        (sum, v) => sum + v.inventoryQuantity,
        0,
      )

      return {
        ...product,
        variantCount: variants.length,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
        totalInventory,
      }
    }),
  )

  return { success: true, data: productsWithMeta }
}

export async function createProductLogic(data: ProductInput) {
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
      })
      .returning()

    await tx.insert(productVariants).values({
      productId: newProduct.id,
      price: price || '0.00',
      compareAtPrice,
      sku,
      barcode,
      inventoryQuantity: inventoryQuantity || 0,
      weight: weight || '0.00',
    })

    if (Array.isArray(images) && images.length > 0) {
      await tx.insert(productImages).values(
        images.map(
          (img: { url: string; altText?: LocalizedString }, index: number) => ({
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
}

export const getProductsFn = createServerFn({ method: 'GET' }).handler(
  getProductsLogic,
)

export const createProductFn = createServerFn({ method: 'POST' })
  .inputValidator((d: ProductInput) => d)
  .handler(({ data }) => createProductLogic(data))
