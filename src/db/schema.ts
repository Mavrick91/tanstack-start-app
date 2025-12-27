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

export const collectionSortEnum = pgEnum('collection_sort', [
  'manual',
  'best_selling',
  'newest',
  'price_asc',
  'price_desc',
])

export const inventoryPolicyEnum = pgEnum('inventory_policy', [
  'deny', // Stop selling when out of stock
  'continue', // Continue selling (Made on Demand)
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
  // Inventory
  inventoryQuantity: integer('inventory_quantity').default(0).notNull(),
  inventoryPolicy: inventoryPolicyEnum('inventory_policy')
    .default('continue')
    .notNull(), // Default: Made on Demand
  available: integer('available').default(1).notNull(), // 1 = available, 0 = unavailable
  // Identifiers
  sku: text('sku'),
  barcode: text('barcode'),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  position: integer('position').default(0).notNull(),
})

// Product Images
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
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
