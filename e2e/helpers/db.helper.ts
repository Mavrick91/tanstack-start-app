import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, like, sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/tanstack_start'
const client = postgres(connectionString)
const db = drizzle(client, { schema })

export const TEST_PREFIX = 'e2e-test-'

export interface SeededProduct {
  id: string
  handle: string
  name: { en: string }
  variantId: string
  price: string
}

export interface SeededCustomer {
  id: string
  email: string
}

export async function seedProduct(overrides?: {
  name?: string
  price?: number
  handle?: string
}): Promise<SeededProduct> {
  const uniqueId = `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const name = overrides?.name || `Test Product ${uniqueId}`
  const handle = overrides?.handle || `test-product-${uniqueId}`
  const price = overrides?.price?.toString() || '29.99'

  // Create product
  const [product] = await db
    .insert(schema.products)
    .values({
      handle,
      status: 'active',
      name: { en: name },
      description: { en: 'Test product for e2e testing' },
      publishedAt: new Date(),
    })
    .returning()

  // Create variant
  const [variant] = await db
    .insert(schema.productVariants)
    .values({
      productId: product.id,
      title: 'Default',
      price,
      available: 1,
      sku: `SKU-${uniqueId}`,
    })
    .returning()

  // Create image
  await db.insert(schema.productImages).values({
    productId: product.id,
    url: 'https://placehold.co/400x400/png?text=Test+Product',
    position: 0,
  })

  return {
    id: product.id,
    handle: product.handle,
    name: { en: name },
    variantId: variant.id,
    price,
  }
}

export async function seedCustomer(options?: {
  email?: string
  withAddress?: boolean
}): Promise<SeededCustomer> {
  const uniqueId = `${TEST_PREFIX}${Date.now()}`
  const email = options?.email || `${uniqueId}@playwright.dev`

  const [customer] = await db
    .insert(schema.customers)
    .values({
      email,
      firstName: 'Test',
      lastName: 'Customer',
    })
    .returning()

  if (options?.withAddress) {
    await db.insert(schema.addresses).values({
      customerId: customer.id,
      firstName: 'Test',
      lastName: 'Customer',
      address1: '123 Test Street',
      city: 'New York',
      province: 'NY',
      zip: '10001',
      country: 'United States',
      countryCode: 'US',
      isDefault: true,
    })
  }

  return {
    id: customer.id,
    email: customer.email,
  }
}

export async function getOrder(orderId: string) {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1)

  if (!order) return undefined

  const orderItems = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId))

  return { ...order, orderItems }
}

export async function getOrderByPaymentId(paymentId: string) {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.paymentId, paymentId))
    .limit(1)

  return order
}

export async function getCheckout(checkoutId: string) {
  const [checkout] = await db
    .select()
    .from(schema.checkouts)
    .where(eq(schema.checkouts.id, checkoutId))
    .limit(1)

  return checkout
}

export async function cleanupTestData(): Promise<void> {
  // Delete test orders and their items
  await db.execute(sql`
    DELETE FROM order_items WHERE order_id IN (
      SELECT id FROM orders WHERE email LIKE ${`${TEST_PREFIX}%`}
    )
  `)
  await db
    .delete(schema.orders)
    .where(like(schema.orders.email, `${TEST_PREFIX}%`))

  // Delete test checkouts
  await db
    .delete(schema.checkouts)
    .where(like(schema.checkouts.email, `${TEST_PREFIX}%`))

  // Delete test customers and their addresses
  await db.execute(sql`
    DELETE FROM addresses WHERE customer_id IN (
      SELECT id FROM customers WHERE email LIKE ${`${TEST_PREFIX}%`}
    )
  `)
  await db
    .delete(schema.customers)
    .where(like(schema.customers.email, `${TEST_PREFIX}%`))

  // Delete test product images
  await db.execute(sql`
    DELETE FROM product_images WHERE product_id IN (
      SELECT id FROM products WHERE handle LIKE ${`${TEST_PREFIX}%`}
    )
  `)

  // Delete test product variants
  await db.execute(sql`
    DELETE FROM product_variants WHERE product_id IN (
      SELECT id FROM products WHERE handle LIKE ${`${TEST_PREFIX}%`}
    )
  `)

  // Delete test products
  await db
    .delete(schema.products)
    .where(like(schema.products.handle, `${TEST_PREFIX}%`))
}

export async function closeConnection(): Promise<void> {
  await client.end()
}
