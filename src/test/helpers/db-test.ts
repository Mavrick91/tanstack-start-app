/**
 * Database test utilities for integration testing.
 * Provides seed and cleanup functions for real database tests.
 */

import { eq, inArray } from 'drizzle-orm'

import { db } from '../../db'
import {
  products,
  productVariants,
  productImages,
  checkouts,
  customers,
  orders,
  users,
} from '../../db/schema'

// Track created IDs for cleanup
type CreatedIds = {
  products: string[]
  variants: string[]
  images: string[]
  checkouts: string[]
  customers: string[]
  orders: string[]
  users: string[]
}

let createdIds: CreatedIds = {
  products: [],
  variants: [],
  images: [],
  checkouts: [],
  customers: [],
  orders: [],
  users: [],
}

/**
 * Reset the tracking of created IDs.
 * Call this at the start of each test.
 */
export const resetTestIds = () => {
  createdIds = {
    products: [],
    variants: [],
    images: [],
    checkouts: [],
    customers: [],
    orders: [],
    users: [],
  }
}

/**
 * Clean up all test data created during the test.
 * Call this after each test.
 */
export const cleanupTestData = async () => {
  // Delete in reverse dependency order
  if (createdIds.orders.length > 0) {
    // Order items are cascade deleted with orders
    await db.delete(orders).where(inArray(orders.id, createdIds.orders))
  }

  if (createdIds.checkouts.length > 0) {
    await db
      .delete(checkouts)
      .where(inArray(checkouts.id, createdIds.checkouts))
  }

  if (createdIds.customers.length > 0) {
    await db
      .delete(customers)
      .where(inArray(customers.id, createdIds.customers))
  }

  if (createdIds.users.length > 0) {
    await db.delete(users).where(inArray(users.id, createdIds.users))
  }

  // Product images, variants are cascade deleted with products
  if (createdIds.products.length > 0) {
    await db.delete(products).where(inArray(products.id, createdIds.products))
  }

  resetTestIds()
}

type SeedProductOptions = {
  name?: string
  handle?: string
  status?: 'draft' | 'active' | 'archived'
  price?: number
  variantTitle?: string
  sku?: string
  inventory?: number
}

/**
 * Seed a product with a default variant for testing.
 */
export const seedProduct = async (options: SeedProductOptions = {}) => {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const handle = options.handle || `test-product-${uniqueId}`

  const [product] = await db
    .insert(products)
    .values({
      handle,
      name: { en: options.name || 'Test Product', fr: 'Produit Test' },
      description: { en: 'A test product', fr: 'Un produit test' },
      status: options.status || 'active',
      publishedAt: options.status === 'active' ? new Date() : null,
    })
    .returning()

  createdIds.products.push(product.id)

  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      title: options.variantTitle || 'Default Title',
      price: String(options.price ?? 99.99),
      sku: options.sku || `SKU-${uniqueId}`,
      available: options.inventory ?? 100,
      position: 0,
    })
    .returning()

  createdIds.variants.push(variant.id)

  return { product, variant }
}

/**
 * Seed a product with an image.
 */
export const seedProductWithImage = async (
  options: SeedProductOptions = {},
) => {
  const { product, variant } = await seedProduct(options)

  const [image] = await db
    .insert(productImages)
    .values({
      productId: product.id,
      url: `https://example.com/test-image-${Date.now()}.jpg`,
      altText: { en: 'Test image', fr: 'Image test' },
      position: 0,
    })
    .returning()

  createdIds.images.push(image.id)

  return { product, variant, image }
}

type SeedCheckoutOptions = {
  email?: string
  items?: Array<{
    productId: string
    variantId: string
    quantity: number
    title: string
    price: number
  }>
  subtotal?: number
  total?: number
  shippingTotal?: number
  taxTotal?: number
  expiresAt?: Date
  completedAt?: Date | null
  customerId?: string
  shippingAddress?: {
    firstName: string
    lastName: string
    address1: string
    city: string
    province?: string
    provinceCode?: string
    country: string
    countryCode: string
    zip: string
    phone?: string
  }
  shippingRateId?: string
  shippingMethod?: string
}

/**
 * Seed a checkout for testing.
 */
export const seedCheckout = async (options: SeedCheckoutOptions = {}) => {
  const defaultItems = options.items || [
    {
      productId: 'prod-1',
      variantId: 'var-1',
      quantity: 1,
      title: 'Test Product',
      price: 99.99,
    },
  ]

  const subtotal = options.subtotal ?? 99.99
  const shippingTotal = options.shippingTotal ?? 0
  const taxTotal = options.taxTotal ?? 8.0
  const total = options.total ?? subtotal + shippingTotal + taxTotal

  const [checkout] = await db
    .insert(checkouts)
    .values({
      email: options.email || null,
      customerId: options.customerId || null,
      cartItems: defaultItems,
      subtotal: String(subtotal),
      shippingTotal: String(shippingTotal),
      taxTotal: String(taxTotal),
      total: String(total),
      currency: 'USD',
      shippingAddress: options.shippingAddress || null,
      shippingRateId: options.shippingRateId || null,
      shippingMethod: options.shippingMethod || null,
      expiresAt:
        options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt:
        options.completedAt === undefined ? null : options.completedAt,
    })
    .returning()

  createdIds.checkouts.push(checkout.id)

  return checkout
}

/**
 * Seed a customer for testing.
 */
export const seedCustomer = async (
  options: {
    email?: string
    firstName?: string
    lastName?: string
    userId?: string
  } = {},
) => {
  const timestamp = Date.now()

  const [customer] = await db
    .insert(customers)
    .values({
      email: options.email || `test-${timestamp}@example.com`,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'Customer',
      userId: options.userId || null,
    })
    .returning()

  createdIds.customers.push(customer.id)

  return customer
}

/**
 * Seed a user for testing.
 */
export const seedUser = async (
  options: {
    email?: string
    passwordHash?: string
    role?: string
  } = {},
) => {
  const timestamp = Date.now()

  const [user] = await db
    .insert(users)
    .values({
      email: options.email || `test-user-${timestamp}@example.com`,
      passwordHash: options.passwordHash || '$2a$10$test-hash',
      role: options.role || 'user',
    })
    .returning()

  createdIds.users.push(user.id)

  return user
}

/**
 * Get a checkout by ID (for assertions).
 */
export const getCheckout = async (id: string) => {
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, id))
    .limit(1)

  return checkout
}

/**
 * Get an order by checkout-related criteria (for assertions).
 */
export const getOrderByEmail = async (email: string) => {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.email, email))
    .limit(1)

  return order
}
