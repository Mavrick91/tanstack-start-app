import {
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ============================================
// AUTH TABLES
// ============================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user').notNull(),
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

// ============================================
// PRODUCT TABLES
// ============================================

// Enums
export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
])

export const inventoryPolicyEnum = pgEnum('inventory_policy', [
  'deny',
  'continue',
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

// Products
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
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Product Options (Color, Size, etc.)
export const productOptions = pgTable('product_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: jsonb('name').$type<LocalizedString>().notNull(),
  position: integer('position').default(0).notNull(),
})

// Option Values (Red, Blue, S, M, L, etc.)
export const productOptionValues = pgTable('product_option_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  optionId: uuid('option_id')
    .notNull()
    .references(() => productOptions.id, { onDelete: 'cascade' }),
  value: jsonb('value').$type<LocalizedString>().notNull(),
  position: integer('position').default(0).notNull(),
})

// Product Variants
export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').unique(),
  barcode: text('barcode'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  inventoryQuantity: integer('inventory_quantity').default(0).notNull(),
  inventoryPolicy: inventoryPolicyEnum('inventory_policy')
    .default('deny')
    .notNull(),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Junction: Variant <-> Option Values
export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    optionValueId: uuid('option_value_id')
      .notNull()
      .references(() => productOptionValues.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.optionValueId] })],
)

// Product Images
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, {
    onDelete: 'set null',
  }),
  url: text('url').notNull(),
  altText: jsonb('alt_text').$type<LocalizedString>(),
  position: integer('position').default(0).notNull(),
})

// ============================================
// COLLECTIONS
// ============================================

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  handle: text('handle').notNull().unique(),
  name: jsonb('name').$type<LocalizedString>().notNull(),
  description: jsonb('description').$type<LocalizedString>(),
  imageUrl: text('image_url'),
  sortOrder: collectionSortEnum('sort_order').default('manual').notNull(),
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
