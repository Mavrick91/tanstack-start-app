import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable for Google OAuth users
  role: text('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  type: text('type').notNull(), // 'verify_email' | 'reset_password'
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Enums
export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
])

export const collectionSortEnum = pgEnum('collection_sort', [
  'manual',
  'best_selling',
  'newest',
  'price_asc',
  'price_desc',
])

// i18n JSONB type helper
type LocalizedString = { en: string; fr?: string; id?: string }

// Products (parent entity - no pricing/inventory, those live on variants)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  handle: text('handle').notNull().unique(),
  status: productStatusEnum('status').default('draft').notNull(),
  name: jsonb('name').$type<LocalizedString>().notNull(),
  description: jsonb('description').$type<LocalizedString>(),
  metaTitle: jsonb('meta_title').$type<LocalizedString>(),
  metaDescription: jsonb('meta_description').$type<LocalizedString>(),
  vendor: text('vendor'),
  productType: text('product_type'),
  tags: text('tags').array(),
  // Timestamps
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Product Options (e.g., "Shape", "Length")
export const productOptions = pgTable('product_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Shape"
  values: text('values').array().notNull(), // e.g., ["Coffin", "Almond", "Stiletto"]
  position: integer('position').default(0).notNull(),
})

// Product Variants (combinations of options with pricing)
type SelectedOption = { name: string; value: string }
export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Coffin / Long" or "Default Title"
  selectedOptions: jsonb('selected_options').$type<SelectedOption[]>(),
  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  available: integer('available').default(1).notNull(), // 1 = available, 0 = unavailable
  // Identifiers
  sku: text('sku'),
  barcode: text('barcode'),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  position: integer('position').default(0).notNull(),
})

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  publicId: text('public_id'), // Cloudinary public_id for management
  filename: text('filename'),
  size: integer('size'), // bytes
  mimeType: text('mime_type'),
  width: integer('width'),
  height: integer('height'),
  altText: jsonb('alt_text').$type<LocalizedString>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Product Images
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id').references(() => media.id, {
    onDelete: 'set null',
  }),
  url: text('url').notNull(),
  altText: jsonb('alt_text').$type<LocalizedString>(),
  position: integer('position').default(0).notNull(),
})

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  handle: text('handle').notNull().unique(),
  name: jsonb('name').$type<LocalizedString>().notNull(),
  description: jsonb('description').$type<LocalizedString>(),
  sortOrder: collectionSortEnum('sort_order').default('manual').notNull(),
  metaTitle: jsonb('meta_title').$type<LocalizedString>(),
  metaDescription: jsonb('meta_description').$type<LocalizedString>(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Junction: Collection <-> Products
export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').default(0).notNull(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.productId] })],
)

// Order status enums
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
])

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'unfulfilled',
  'partial',
  'fulfilled',
])

export const addressTypeEnum = pgEnum('address_type', ['shipping', 'billing'])

// Address type for JSONB storage
export type AddressSnapshot = {
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  provinceCode?: string
  country: string
  countryCode: string
  zip: string
  phone?: string
}

// Customers (extends users for customer-specific data, null user_id for guests)
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  acceptsMarketing: boolean('accepts_marketing').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Customer addresses
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  type: addressTypeEnum('type').default('shipping').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  company: text('company'),
  address1: text('address1').notNull(),
  address2: text('address2'),
  city: text('city').notNull(),
  province: text('province'),
  provinceCode: text('province_code'),
  country: text('country').notNull(),
  countryCode: text('country_code').notNull(),
  zip: text('zip').notNull(),
  phone: text('phone'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Checkout sessions (temporary state before order creation)
export const checkouts = pgTable('checkouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, {
    onDelete: 'set null',
  }),
  email: text('email'),
  // Flag to save address when guest creates account
  pendingSaveAddress: boolean('pending_save_address').default(false),
  // Cart items snapshot
  cartItems: jsonb('cart_items')
    .$type<
      Array<{
        productId: string
        variantId?: string
        quantity: number
        title: string
        variantTitle?: string
        sku?: string
        price: number
        imageUrl?: string
      }>
    >()
    .notNull(),
  // Totals
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingTotal: decimal('shipping_total', { precision: 10, scale: 2 }).default(
    '0',
  ),
  taxTotal: decimal('tax_total', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  // Shipping
  shippingAddress: jsonb('shipping_address').$type<AddressSnapshot>(),
  billingAddress: jsonb('billing_address').$type<AddressSnapshot>(),
  shippingRateId: text('shipping_rate_id'),
  shippingMethod: text('shipping_method'),
  // Status
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: serial('order_number').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  email: text('email').notNull(),
  // Financial
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingTotal: decimal('shipping_total', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  taxTotal: decimal('tax_total', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  // Status
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status')
    .default('pending')
    .notNull(),
  fulfillmentStatus: fulfillmentStatusEnum('fulfillment_status')
    .default('unfulfilled')
    .notNull(),
  // Shipping
  shippingMethod: text('shipping_method'),
  shippingAddress: jsonb('shipping_address').$type<AddressSnapshot>().notNull(),
  billingAddress: jsonb('billing_address').$type<AddressSnapshot>(),
  // Payment
  paymentProvider: text('payment_provider'), // 'stripe' | 'paypal'
  paymentId: text('payment_id'), // Stripe PaymentIntent ID or PayPal Order ID
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
  cancelledAt: timestamp('cancelled_at'),
})

// Order line items
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  variantId: uuid('variant_id').references(() => productVariants.id, {
    onDelete: 'set null',
  }),
  // Snapshot of product at time of order
  title: text('title').notNull(),
  variantTitle: text('variant_title'),
  sku: text('sku'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  // Product image snapshot
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Shipping rates configuration
export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  estimatedDaysMin: integer('estimated_days_min'),
  estimatedDaysMax: integer('estimated_days_max'),
  isActive: boolean('is_active').default(true),
  position: integer('position').default(0),
})

// Order status change history (audit trail)
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  previousValue: text('previous_value').notNull(),
  newValue: text('new_value').notNull(),
  changedBy: text('changed_by').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Event ID from provider (Stripe/PayPal)
  provider: text('provider').notNull(), // 'stripe' | 'paypal'
  eventType: text('event_type').notNull(),
  orderId: uuid('order_id').references(() => orders.id, {
    onDelete: 'set null',
  }),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
})

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(), // IP:limiterType compound key
  points: integer('points').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
})
