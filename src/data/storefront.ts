import { createServerFn } from '@tanstack/react-start'

import type { ProductOption, ProductVariant } from '../types/store'

// Helper to dynamically import database context (prevents server code leaking to client)
const getDbContext = async () => {
  const { db } = await import('../db')
  const { and, asc, desc, eq, inArray, isNotNull, sql } =
    await import('drizzle-orm')
  const {
    collectionProducts,
    collections,
    productImages,
    productOptions,
    products,
    productVariants,
  } = await import('../db/schema')
  return {
    db,
    and,
    asc,
    desc,
    eq,
    inArray,
    isNotNull,
    sql,
    collectionProducts,
    collections,
    productImages,
    productOptions,
    products,
    productVariants,
  }
}

type LocalizedString = { en: string; fr?: string; id?: string }

const getLocalizedText = (value: LocalizedString | null, lang = 'en') => {
  if (!value) return ''
  return value[lang as keyof LocalizedString] || value.en || ''
}

const toStorefrontProduct = (
  dbProduct: {
    id: string
    handle: string
    name: LocalizedString
    description: LocalizedString | null
    productType: string | null
    status: string
  },
  images: { url: string }[],
  price: string | null,
  lang = 'en',
  options?: ProductOption[],
  variants?: ProductVariant[],
) => {
  return {
    id: dbProduct.id,
    name: getLocalizedText(dbProduct.name, lang),
    slug: dbProduct.handle,
    description: getLocalizedText(dbProduct.description, lang),
    price: price ? parseFloat(price) : 0,
    currency: 'USD',
    images:
      images.length > 0
        ? images.map((img) => img.url)
        : [
            'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1000',
          ],
    category: dbProduct.productType || 'Nail Art',
    isFeatured: true,
    options,
    variants,
  }
}

const fetchProductImages = async (
  productId: string,
  ctx: Awaited<ReturnType<typeof getDbContext>>,
) => {
  const { db, eq, productImages } = ctx
  return db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.position)
}

// Batch fetch: Get all images for multiple products in a single query
const fetchProductImagesBatch = async (
  productIds: string[],
  ctx: Awaited<ReturnType<typeof getDbContext>>,
) => {
  if (productIds.length === 0) return {}

  const { db, inArray, asc, productImages } = ctx
  const allImages = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.position))

  // Group by productId
  const imagesByProduct: Record<string, { url: string }[]> = {}
  for (const id of productIds) {
    imagesByProduct[id] = []
  }
  for (const img of allImages) {
    if (imagesByProduct[img.productId]) {
      imagesByProduct[img.productId].push({ url: img.url })
    }
  }
  return imagesByProduct
}

// Batch fetch: Get first variant for each product in a single query
const fetchProductFirstVariantBatch = async (
  productIds: string[],
  ctx: Awaited<ReturnType<typeof getDbContext>>,
) => {
  if (productIds.length === 0) return {}

  const { db, inArray, asc, productVariants } = ctx
  const allVariants = await db
    .select({
      productId: productVariants.productId,
      price: productVariants.price,
      position: productVariants.position,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .orderBy(asc(productVariants.position))

  // Get only the first variant (lowest position) for each product
  const variantsByProduct: Record<string, { price: string } | null> = {}
  for (const id of productIds) {
    variantsByProduct[id] = null
  }
  for (const v of allVariants) {
    if (variantsByProduct[v.productId] === null) {
      variantsByProduct[v.productId] = { price: v.price }
    }
  }
  return variantsByProduct
}

const fetchProductOptionsAndVariants = async (
  productId: string,
  ctx: Awaited<ReturnType<typeof getDbContext>>,
) => {
  const { db, eq, asc, productOptions, productVariants } = ctx
  // Fetch options
  const dbOptions = await db
    .select({
      id: productOptions.id,
      name: productOptions.name,
      values: productOptions.values,
      position: productOptions.position,
    })
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position))

  // Fetch variants
  const dbVariants = await db
    .select({
      id: productVariants.id,
      title: productVariants.title,
      price: productVariants.price,
      sku: productVariants.sku,
      available: productVariants.available,
      selectedOptions: productVariants.selectedOptions,
      position: productVariants.position,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.position))

  return {
    options: dbOptions.map((o) => ({
      name: o.name,
      values: o.values as string[],
    })),
    variants: dbVariants.map((v) => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price),
      sku: v.sku || undefined,
      available: v.available === 1,
      selectedOptions:
        (v.selectedOptions as Array<{ name: string; value: string }>) || [],
    })),
  }
}

export const getCollections = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    // Dynamic import to prevent server code leaking to client
    const ctx = await getDbContext()
    const {
      db,
      desc,
      isNotNull,
      sql,
      collections,
      collectionProducts,
      productImages,
    } = ctx

    const dbCollections = await db
      .select({
        id: collections.id,
        handle: collections.handle,
        name: collections.name,
        description: collections.description,
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
      .where(isNotNull(collections.publishedAt))
      .orderBy(desc(collections.createdAt))

    return dbCollections.map((c) => ({
      id: c.id,
      handle: c.handle,
      name: getLocalizedText(c.name, lang),
      description: getLocalizedText(c.description, lang),
      previewImages: c.previewImages,
      productCount: c.productCount,
    }))
  })

export const getProducts = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    // Dynamic import to prevent server code leaking to client
    const ctx = await getDbContext()
    const { db, eq, desc, products } = ctx

    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(desc(products.createdAt))

    // Batch fetch images and variants to avoid N+1 queries
    const productIds = dbProducts.map((p) => p.id)
    const [imagesMap, variantsMap] = await Promise.all([
      fetchProductImagesBatch(productIds, ctx),
      fetchProductFirstVariantBatch(productIds, ctx),
    ])

    return dbProducts.map((product) =>
      toStorefrontProduct(
        product,
        imagesMap[product.id] || [],
        variantsMap[product.id]?.price || null,
        lang,
      ),
    )
  })

export const getFeaturedProducts = createServerFn({ method: 'GET' })
  .inputValidator((d: { lang?: string }) => d)
  .handler(async ({ data }) => {
    const lang = data?.lang || 'en'

    // Dynamic import to prevent server code leaking to client
    const ctx = await getDbContext()
    const { db, eq, desc, products } = ctx

    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(desc(products.createdAt))
      .limit(3)

    // Batch fetch images and variants to avoid N+1 queries
    const productIds = dbProducts.map((p) => p.id)
    const [imagesMap, variantsMap] = await Promise.all([
      fetchProductImagesBatch(productIds, ctx),
      fetchProductFirstVariantBatch(productIds, ctx),
    ])

    return dbProducts.map((product) =>
      toStorefrontProduct(
        product,
        imagesMap[product.id] || [],
        variantsMap[product.id]?.price || null,
        lang,
      ),
    )
  })

export const getProductBySlug = createServerFn({ method: 'GET' })
  .inputValidator((d: { slug: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const { slug, lang = 'en' } = data

    // Dynamic import to prevent server code leaking to client
    const ctx = await getDbContext()
    const { db, eq, products } = ctx

    const [dbProduct] = await db
      .select()
      .from(products)
      .where(eq(products.handle, slug))

    if (!dbProduct) {
      throw new Error('Product not found')
    }

    const images = await fetchProductImages(dbProduct.id, ctx)
    const { options, variants } = await fetchProductOptionsAndVariants(
      dbProduct.id,
      ctx,
    )

    // Use first available variant price, or 0 if no variants
    const firstVariant = variants.find((v) => v.available) || variants[0]
    const price = firstVariant?.price?.toString() || null

    return toStorefrontProduct(
      dbProduct,
      images,
      price,
      lang,
      options,
      variants,
    )
  })

export const getCollectionByHandle = createServerFn({ method: 'GET' })
  .inputValidator((d: { handle: string; lang?: string; sort?: string }) => d)
  .handler(async ({ data }) => {
    const { handle, lang = 'en', sort } = data

    // Dynamic import to prevent server code leaking to client
    const ctx = await getDbContext()
    const {
      db,
      eq,
      and,
      asc,
      desc,
      collections,
      collectionProducts,
      products,
    } = ctx

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.handle, handle))

    if (!collection) {
      throw new Error('Collection not found')
    }

    // Draft visibility check: unpublished collections should not be accessible on storefront
    if (!collection.publishedAt) {
      throw new Error('Collection not found')
    }

    // Determine sort order
    // If explicit sort is provided from UI, use it. Otherwise, use collection default.
    const effectiveSort = sort || collection.sortOrder || 'manual'

    // Build order clause
    // Note: price-based sorting requires a subquery since price is on variants
    let orderByClause
    switch (effectiveSort) {
      case 'newest':
        orderByClause = desc(products.createdAt)
        break
      case 'price_asc':
      case 'price_desc':
        // For price sorting, we'll sort after fetching (since price is on variants)
        orderByClause = asc(collectionProducts.position)
        break
      case 'manual':
      default:
        orderByClause = asc(collectionProducts.position)
        break
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
      .orderBy(orderByClause)

    // Batch fetch images and variants to avoid N+1 queries
    const productIds = collectionProductsList.map(({ product }) => product.id)
    const [imagesMap, variantsMap] = await Promise.all([
      fetchProductImagesBatch(productIds, ctx),
      fetchProductFirstVariantBatch(productIds, ctx),
    ])

    let productsList = collectionProductsList.map(({ product }) =>
      toStorefrontProduct(
        product,
        imagesMap[product.id] || [],
        variantsMap[product.id]?.price || null,
        lang,
      ),
    )

    // Post-fetch sorting for price (since price is on variants)
    if (effectiveSort === 'price_asc') {
      productsList = productsList.sort((a, b) => a.price - b.price)
    } else if (effectiveSort === 'price_desc') {
      productsList = productsList.sort((a, b) => b.price - a.price)
    }

    return {
      id: collection.id,
      name: getLocalizedText(collection.name, lang),
      description: getLocalizedText(collection.description, lang),
      products: productsList,
      sortOrder: collection.sortOrder,
    }
  })
