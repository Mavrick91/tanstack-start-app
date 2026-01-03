import { hash } from 'bcrypt-ts'
import { eq, like, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '../../src/db/schema'

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:password@localhost:5434/finenail_db'
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

export interface SeededAuthenticatedCustomer extends SeededCustomer {
  userId: string
  password: string
}

export const seedProduct = async (overrides?: {
  name?: string
  price?: number
  handle?: string
}): Promise<SeededProduct> => {
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

export const seedCustomer = async (options?: {
  email?: string
  withAddress?: boolean
}): Promise<SeededCustomer> => {
  const uniqueId = `${TEST_PREFIX}${Date.now()}`
  const email = options?.email || `${uniqueId}@realadvisor.com`

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

export const seedAuthenticatedCustomer = async (options?: {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  withAddress?: boolean
}): Promise<SeededAuthenticatedCustomer> => {
  const uniqueId = `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = options?.email || `${uniqueId}@realadvisor.com`
  const password = options?.password || 'TestPassword123!'
  const firstName = options?.firstName || 'Test'
  const lastName = options?.lastName || 'Customer'

  // Hash the password
  const passwordHash = await hash(password, 10)

  // Create user record
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      role: 'user',
      emailVerified: true,
    })
    .returning()

  // Create customer record linked to user
  const [customer] = await db
    .insert(schema.customers)
    .values({
      userId: user.id,
      email,
      firstName,
      lastName,
    })
    .returning()

  if (options?.withAddress) {
    await db.insert(schema.addresses).values({
      customerId: customer.id,
      firstName,
      lastName,
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
    userId: user.id,
    email: customer.email,
    password, // Return plain password for test usage
  }
}

export const seedAuthenticatedAdmin = async (options?: {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
}): Promise<SeededAuthenticatedCustomer> => {
  const uniqueId = `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = options?.email || `admin-${uniqueId}@realadvisor.com`
  const password = options?.password || 'AdminPassword123!'
  const firstName = options?.firstName || 'Admin'
  const lastName = options?.lastName || 'User'

  // Hash the password
  const passwordHash = await hash(password, 10)

  // Create user record with admin role
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      role: 'admin',
      emailVerified: true,
    })
    .returning()

  // Create customer record linked to user
  const [customer] = await db
    .insert(schema.customers)
    .values({
      userId: user.id,
      email,
      firstName,
      lastName,
    })
    .returning()

  return {
    id: customer.id,
    userId: user.id,
    email: customer.email,
    password, // Return plain password for test usage
  }
}

export const getOrder = async (orderId: string) => {
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

export const getOrderByPaymentId = async (paymentId: string) => {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.paymentId, paymentId))
    .limit(1)

  return order
}

export const getCheckout = async (checkoutId: string) => {
  const [checkout] = await db
    .select()
    .from(schema.checkouts)
    .where(eq(schema.checkouts.id, checkoutId))
    .limit(1)

  return checkout
}

export const cleanupTestData = async (): Promise<void> => {
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

  // Delete test email verification tokens (before deleting users due to FK)
  await db.execute(sql`
    DELETE FROM email_verification_tokens WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE ${`${TEST_PREFIX}%`}
    )
  `)

  // Delete test users (sessions will cascade delete)
  await db
    .delete(schema.users)
    .where(like(schema.users.email, `${TEST_PREFIX}%`))

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

  // Clear rate limits (important for e2e tests to avoid rate limit errors)
  await db.delete(schema.rateLimits)
}

/**
 * Clean up the specific test user email (mavrick@realadvisor.com)
 * This should be called after all tests complete
 */
export const cleanupTestEmail = async (
  email: string,
): Promise<{
  deletedUsers: number
  deletedCustomers: number
  deletedOrders: number
}> => {
  console.log(`   🔍 Looking for data with email: ${email}`)

  // Delete orders and their items for this email
  await db.execute(sql`
    DELETE FROM order_items WHERE order_id IN (
      SELECT id FROM orders WHERE email = ${email}
    )
  `)
  const deletedOrders = await db
    .delete(schema.orders)
    .where(eq(schema.orders.email, email))
    .returning()

  // Delete checkouts for this email
  await db.delete(schema.checkouts).where(eq(schema.checkouts.email, email))

  // Delete customers and their addresses for this email
  await db.execute(sql`
    DELETE FROM addresses WHERE customer_id IN (
      SELECT id FROM customers WHERE email = ${email}
    )
  `)
  const deletedCustomers = await db
    .delete(schema.customers)
    .where(eq(schema.customers.email, email))
    .returning()

  // Delete email verification tokens (before deleting users due to FK)
  await db.execute(sql`
    DELETE FROM email_verification_tokens WHERE user_id IN (
      SELECT id FROM users WHERE email = ${email}
    )
  `)

  // Delete users (sessions will cascade delete)
  const deletedUsers = await db
    .delete(schema.users)
    .where(eq(schema.users.email, email))
    .returning()

  return {
    deletedUsers: deletedUsers.length,
    deletedCustomers: deletedCustomers.length,
    deletedOrders: deletedOrders.length,
  }
}

/**
 * Get or create a verification token for testing purposes
 * Since tokens are hashed in the database, this creates a new test token
 * that can be used in e2e tests
 */
export const getVerificationTokenByEmail = async (
  email: string,
): Promise<string | undefined> => {
  const { randomBytes, createHash } = await import('crypto')

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  if (!user) return undefined

  // Generate a new test token
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // Delete any existing verification tokens for this user
  await db
    .delete(schema.emailVerificationTokens)
    .where(eq(schema.emailVerificationTokens.userId, user.id))

  // Create new verification token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await db.insert(schema.emailVerificationTokens).values({
    userId: user.id,
    tokenHash,
    type: 'verify_email',
    expiresAt,
  })

  return token
}

export const closeConnection = async (): Promise<void> => {
  await client.end()
}
