import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm'

import { db } from '../db'
import {
  collectionProducts,
  collections,
  productImages,
  products,
} from '../db/schema'

import type { Product } from '../types/store'

type LocalizedString = { en: string; fr?: string; id?: string }

function getLocalizedText(value: LocalizedString | null, lang = 'en'): string {
  if (!value) return ''
  return value[lang as keyof LocalizedString] || value.en || ''
}

function toStorefrontProduct(
  dbProduct: {
    id: string
    handle: string
    name: LocalizedString
    description: LocalizedString | null
    price: string | null
    productType: string | null
    status: string
  },
  images: { url: string }[],
  lang = 'en',
): Product {
  return {
    id: dbProduct.id,
    name: getLocalizedText(dbProduct.name, lang),
    slug: dbProduct.handle,
    description: getLocalizedText(dbProduct.description, lang),
    price: dbProduct.price ? parseFloat(dbProduct.price) : 0,
    currency: 'USD',
    images:
      images.length > 0
        ? images.map((img) => img.url)
        : [
            'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1000',
          ],
    category: dbProduct.productType || 'Nail Art',
    isFeatured: true,
  }
}

async function fetchProductImages(productId: string) {
  return db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.position)
}

export const getCollections = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    const dbCollections = await db
      .select({
        id: collections.id,
        handle: collections.handle,
        name: collections.name,
        description: collections.description,
        imageUrl: collections.imageUrl,
        productCount: sql<number>`(
          SELECT COUNT(*) FROM collection_products 
          WHERE collection_id = ${collections.id}
        )::int`,
      })
      .from(collections)
      .where(isNotNull(collections.publishedAt))
      .orderBy(desc(collections.createdAt))

    return dbCollections.map((c) => ({
      id: c.id,
      handle: c.handle,
      name: getLocalizedText(c.name, lang),
      description: getLocalizedText(c.description, lang),
      imageUrl: c.imageUrl,
      productCount: c.productCount,
    }))
  })

export const getProducts = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(desc(products.createdAt))

    return Promise.all(
      dbProducts.map(async (product) => {
        const images = await fetchProductImages(product.id)
        return toStorefrontProduct(product, images, lang)
      }),
    )
  })

export const getFeaturedProducts = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(desc(products.createdAt))
      .limit(3)

    return Promise.all(
      dbProducts.map(async (product) => {
        const images = await fetchProductImages(product.id)
        return toStorefrontProduct(product, images, lang)
      }),
    )
  })

export const getProductBySlug = createServerFn({ method: 'GET' })
  .inputValidator((d: { slug: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const { slug, lang = 'en' } = data

    const [dbProduct] = await db
      .select()
      .from(products)
      .where(eq(products.handle, slug))

    if (!dbProduct) {
      throw new Error('Product not found')
    }

    const images = await fetchProductImages(dbProduct.id)
    return toStorefrontProduct(dbProduct, images, lang)
  })

export const getCollectionByHandle = createServerFn({ method: 'GET' })
  .inputValidator((d: { handle: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const { handle, lang = 'en' } = data

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.handle, handle))

    if (!collection) {
      throw new Error('Collection not found')
    }

    const collectionProductsList = await db
      .select({
        product: products,
        position: collectionProducts.position,
      })
      .from(collectionProducts)
      .innerJoin(products, eq(collectionProducts.productId, products.id))
      .where(
        and(
          eq(collectionProducts.collectionId, collection.id),
          eq(products.status, 'active'),
        ),
      )
      .orderBy(asc(collectionProducts.position))

    const productsList = await Promise.all(
      collectionProductsList.map(async ({ product }) => {
        const images = await fetchProductImages(product.id)
        return toStorefrontProduct(product, images, lang)
      }),
    )

    return {
      id: collection.id,
      name: getLocalizedText(collection.name, lang),
      description: getLocalizedText(collection.description, lang),
      imageUrl: collection.imageUrl,
      products: productsList,
    }
  })
