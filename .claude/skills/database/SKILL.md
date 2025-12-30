---
name: database
description: Drizzle ORM schema design, migrations, queries, and performance optimization for PostgreSQL. Use when modifying schema, writing complex queries, or optimizing database operations.
---

# Database Guide

Complete Drizzle ORM patterns for this PostgreSQL database.

## Quick Commands

```bash
yarn db:generate  # Generate migration from schema changes
yarn db:migrate   # Apply pending migrations
yarn db:push      # Push schema directly (dev only)
yarn db:studio    # Open Drizzle Studio GUI
```

## Schema Location

All schema definitions: `src/db/schema.ts`

## Column Types

### Common Types

```typescript
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

export const example = pgTable('example', {
  // UUID primary key (recommended)
  id: uuid('id').defaultRandom().primaryKey(),

  // Auto-increment (for order numbers)
  orderNumber: serial('order_number').notNull(),

  // Strings
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  handle: text('handle').notNull().unique(),
  description: text('description'),

  // Numbers
  quantity: integer('quantity').default(0).notNull(),
  position: integer('position').default(0).notNull(),

  // Decimals (for money)
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  weight: decimal('weight', { precision: 10, scale: 2 }),

  // Boolean
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
  expiresAt: timestamp('expires_at').notNull(),

  // Arrays
  tags: text('tags').array(),

  // JSONB (typed)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
})
```

### Localized Content (JSONB)

```typescript
type LocalizedString = { en: string; fr?: string; id?: string }

export const products = pgTable('products', {
  name: jsonb('name').$type<LocalizedString>().notNull(),
  description: jsonb('description').$type<LocalizedString>(),
  metaTitle: jsonb('meta_title').$type<LocalizedString>(),
  metaDescription: jsonb('meta_description').$type<LocalizedString>(),
})
```

### Address Snapshot

```typescript
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

export const orders = pgTable('orders', {
  shippingAddress: jsonb('shipping_address').$type<AddressSnapshot>().notNull(),
  billingAddress: jsonb('billing_address').$type<AddressSnapshot>(),
})
```

## Enums

```typescript
// Define enum
export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
])

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

// Use in table
export const products = pgTable('products', {
  status: productStatusEnum('status').default('draft').notNull(),
})
```

## Relationships

### One-to-Many (Foreign Key)

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
})
```

### Optional Reference

```typescript
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Optional link to user (null for guest customers)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
})
```

### Many-to-Many (Junction Table)

```typescript
export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: jsonb('name').$type<LocalizedString>().notNull(),
})

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: jsonb('name').$type<LocalizedString>().notNull(),
})

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
```

## Query Patterns

### Basic Select

```typescript
import { db } from '@/db'
import { products } from '@/db/schema'

// All records
const allProducts = await db.select().from(products)

// Single record
const [product] = await db
  .select()
  .from(products)
  .where(eq(products.id, productId))
  .limit(1)
```

### Filtering

```typescript
import { and, eq, ilike, or, SQL } from 'drizzle-orm'

// Simple condition
const active = await db
  .select()
  .from(products)
  .where(eq(products.status, 'active'))

// Multiple conditions (AND)
const filtered = await db
  .select()
  .from(products)
  .where(and(eq(products.status, 'active'), ilike(products.handle, '%shirt%')))

// Dynamic conditions
const conditions: SQL[] = []

if (search) {
  conditions.push(ilike(products.handle, `%${search}%`) as SQL)
}
if (status) {
  conditions.push(eq(products.status, status))
}

const whereClause = conditions.length > 0 ? and(...conditions) : undefined

const results = await db.select().from(products).where(whereClause)
```

### Sorting

```typescript
import { asc, desc } from 'drizzle-orm'

// Static sort
const newest = await db
  .select()
  .from(products)
  .orderBy(desc(products.createdAt))

// Dynamic sort
const sortColumn =
  {
    name: products.name,
    status: products.status,
    createdAt: products.createdAt,
  }[sortKey] || products.createdAt

const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

const sorted = await db.select().from(products).orderBy(orderBy)
```

### Pagination

```typescript
import { count } from 'drizzle-orm'

const page = 1
const limit = 10
const offset = (page - 1) * limit

// Get total count
const [{ total }] = await db
  .select({ total: count() })
  .from(products)
  .where(whereClause)

// Get paginated items
const items = await db
  .select()
  .from(products)
  .where(whereClause)
  .orderBy(desc(products.createdAt))
  .limit(limit)
  .offset(offset)

return {
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
}
```

### Insert

```typescript
// Single insert with returning
const [newProduct] = await db
  .insert(products)
  .values({
    name: { en: 'New Product' },
    handle: 'new-product',
    status: 'draft',
  })
  .returning()

// Bulk insert
await db.insert(productImages).values([
  { productId: newProduct.id, url: 'image1.jpg', position: 0 },
  { productId: newProduct.id, url: 'image2.jpg', position: 1 },
])
```

### Update

```typescript
// Update with returning
const [updated] = await db
  .update(products)
  .set({
    name: { en: 'Updated Name' },
    status: 'active',
    updatedAt: new Date(),
  })
  .where(eq(products.id, productId))
  .returning()

// Conditional update
await db
  .update(sessions)
  .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
  .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
```

### Delete

```typescript
// Simple delete
await db.delete(products).where(eq(products.id, productId))

// Delete with condition
await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  // Create product
  const [product] = await tx
    .insert(products)
    .values({
      name: body.name,
      handle: body.handle,
      status: 'draft',
    })
    .returning()

  // Create default variant
  await tx.insert(productVariants).values({
    productId: product.id,
    title: 'Default Title',
    price: body.price || '0',
    position: 0,
  })

  // Create images
  if (body.images?.length) {
    await tx.insert(productImages).values(
      body.images.map((img, index) => ({
        productId: product.id,
        url: img.url,
        altText: img.altText,
        position: index,
      })),
    )
  }

  return product
})
```

### Group By

```typescript
import { count, eq } from 'drizzle-orm'

// Count items per order
const itemCounts = await db
  .select({
    orderId: orderItems.orderId,
    itemCount: count(),
  })
  .from(orderItems)
  .groupBy(orderItems.orderId)

// Convert to Map for lookup
const countMap = new Map(itemCounts.map((r) => [r.orderId, r.itemCount]))
```

## Avoiding N+1 Queries

### Problem

```typescript
// BAD: N+1 queries (1 query + N queries for each order)
const orders = await db.select().from(ordersTable)

for (const order of orders) {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
  order.items = items
}
```

### Solution: Batch with Map

```typescript
// GOOD: 2 queries total
const orders = await db.select().from(ordersTable)
const orderIds = orders.map((o) => o.id)

// Single query for all order items
const allItems = await db
  .select()
  .from(orderItems)
  .where(inArray(orderItems.orderId, orderIds))

// Build lookup map
const itemsByOrderId = new Map<string, typeof allItems>()
for (const item of allItems) {
  const existing = itemsByOrderId.get(item.orderId) || []
  existing.push(item)
  itemsByOrderId.set(item.orderId, existing)
}

// Use map
const ordersWithItems = orders.map((order) => ({
  ...order,
  items: itemsByOrderId.get(order.id) || [],
}))
```

### Batch Count Pattern

```typescript
// src/server/orders.ts
export async function getOrderItemCounts(
  orderIds: string[],
): Promise<Map<string, number>> {
  if (orderIds.length === 0) return new Map()

  const counts = await db
    .select({
      orderId: orderItems.orderId,
      count: count(),
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .groupBy(orderItems.orderId)

  return new Map(counts.map((c) => [c.orderId, c.count]))
}
```

## Decimal Handling

```typescript
// src/server/orders.ts

// Parse decimal string to number (avoid floating-point errors)
export function parseDecimal(value: string): number {
  return Math.round(parseFloat(value) * 100) / 100
}

// Format number to decimal string for DB
export function toDecimalString(value: number): string {
  return value.toFixed(2)
}

// Usage
const subtotal = items.reduce((sum, item) => {
  return sum + parseDecimal(item.price) * item.quantity
}, 0)

await db.insert(orders).values({
  subtotal: toDecimalString(subtotal),
  total: toDecimalString(subtotal + shipping + tax),
})
```

## Migration Workflow

### 1. Modify Schema

Edit `src/db/schema.ts`

### 2. Generate Migration

```bash
yarn db:generate
```

Creates file in `drizzle/` like `0005_migration_name.sql`

### 3. Review Migration

Check the generated SQL is correct and safe.

### 4. Apply Migration

```bash
yarn db:migrate
```

### Adding an Index

```typescript
import { index } from 'drizzle-orm/pg-core'

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_created_at_idx').on(table.createdAt),
  ],
)
```

## Type Inference

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { products } from '@/db/schema'

// Type for SELECT results
type Product = InferSelectModel<typeof products>

// Type for INSERT values
type NewProduct = InferInsertModel<typeof products>

// Usage
function createProduct(data: NewProduct): Promise<Product> {
  const [product] = await db.insert(products).values(data).returning()
  return product
}
```

## See Also

- `src/db/schema.ts` - Full schema
- `src/db/index.ts` - Database client
- `drizzle/` - Migration files
- `drizzle.config.ts` - Drizzle configuration
- `api-routes` skill - Using queries in API routes
