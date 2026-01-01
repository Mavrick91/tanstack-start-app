# Reusable Utilities Design

## Overview

Consolidate duplicate logic across the codebase into a unified utility layer. Analysis found 100+ instances of repeated patterns across API routes, database queries, validation, and webhook processing.

## Directory Structure

```
src/lib/
├── api/
│   ├── middleware.ts      # Auth wrappers, rate limiting
│   ├── responses.ts       # Standardized response builders
│   └── validation.ts      # Request validation helpers
├── db/
│   ├── queries.ts         # findById, findByEmail, etc.
│   ├── formatters.ts      # Order/customer data formatting
│   └── transactions.ts    # Transaction helpers
├── constants/
│   ├── status.ts          # Order, payment, fulfillment statuses
│   └── errors.ts          # Standard error codes/messages
├── audit/
│   ├── trail.ts           # Status change recording
│   └── webhooks.ts        # Shared webhook processing
└── utils/
    ├── date.ts            # Date formatting
    ├── currency.ts        # Price/decimal helpers
    └── session.ts         # Cookie/session utilities
```

## Components

### 1. API Middleware (`src/lib/api/middleware.ts`)

Wraps route handlers with auth checks, eliminating 10-15 lines of boilerplate per route.

```typescript
export const withAdminAuth =
  <T>(handler: (request: Request, user: User) => Promise<T>) =>
  async (request: Request) => {
    const auth = await requireAuth(request)
    if (!auth.success) return auth.response
    if (!auth.user) return errorResponse('Unauthorized', 401)
    if (auth.user.role !== 'admin') return errorResponse('Forbidden', 403)
    return handler(request, auth.user)
  }

// Usage:
export const handlers = {
  GET: withAdminAuth(async (request, user) => {
    const orders = await getOrders()
    return successResponse({ orders })
  }),
}
```

### 2. Response Helpers (`src/lib/api/responses.ts`)

Standardizes all 31+ response construction patterns.

```typescript
export const successResponse = <T>(data: T, status = 200) =>
  Response.json(data, { status })

export const errorResponse = (message: string, status = 400, code?: string) =>
  Response.json({ error: message, ...(code && { code }) }, { status })

export const notFoundResponse = (resource = 'Resource') =>
  errorResponse(`${resource} not found`, 404, 'NOT_FOUND')

export const forbiddenResponse = (message = 'Access denied') =>
  errorResponse(message, 403, 'FORBIDDEN')

export const rateLimitResponse = (retryAfter = 60) =>
  new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  })
```

### 3. Database Query Helpers (`src/lib/db/queries.ts`)

Eliminates 16+ duplicate single-row fetch patterns.

```typescript
export const findById = async <T>(
  table: Table,
  id: string,
): Promise<T | null> => {
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1)
  return row ?? null
}

export const findByEmail = async <T>(
  table: Table,
  email: string,
): Promise<T | null> => {
  const [row] = await db
    .select()
    .from(table)
    .where(eq(table.email, email))
    .limit(1)
  return row ?? null
}

export const findManyByIds = async <T>(
  table: Table,
  ids: string[],
): Promise<T[]> => {
  if (ids.length === 0) return []
  return db.select().from(table).where(inArray(table.id, ids))
}

export const buildUpdate = <T extends Record<string, unknown>>(
  current: T,
  updates: Partial<T>,
): Partial<T> & { updatedAt: Date } => {
  const changes: Record<string, unknown> = { updatedAt: new Date() }
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== current[key]) {
      changes[key] = value
    }
  }
  return changes as Partial<T> & { updatedAt: Date }
}
```

### 4. Data Formatters (`src/lib/db/formatters.ts`)

Single source of truth for order/customer data transformation.

```typescript
export const formatOrder = (order: OrderRow, items?: OrderItemRow[]) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  fulfillmentStatus: order.fulfillmentStatus,
  total: order.total,
  currency: order.currency,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  ...(items && { items: items.map(formatOrderItem) }),
})

export const formatOrderItem = (item: OrderItemRow) => ({
  id: item.id,
  productId: item.productId,
  variantId: item.variantId,
  title: item.title,
  quantity: item.quantity,
  price: item.price,
})

export const formatCustomer = (customer: CustomerRow) => ({
  id: customer.id,
  email: customer.email,
  firstName: customer.firstName,
  lastName: customer.lastName,
  createdAt: customer.createdAt,
})
```

### 5. Status Constants (`src/lib/constants/status.ts`)

Type-safe status enums replacing 4+ scattered arrays.

```typescript
export const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
export const ORDER_STATUSES = Object.values(OrderStatus)

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]
export const PAYMENT_STATUSES = Object.values(PaymentStatus)

export const FulfillmentStatus = {
  UNFULFILLED: 'unfulfilled',
  PARTIALLY_FULFILLED: 'partially_fulfilled',
  FULFILLED: 'fulfilled',
} as const

export type FulfillmentStatus =
  (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus]
export const FULFILLMENT_STATUSES = Object.values(FulfillmentStatus)

// Type guards
export const isValidOrderStatus = (s: string): s is OrderStatus =>
  ORDER_STATUSES.includes(s as OrderStatus)

export const isValidPaymentStatus = (s: string): s is PaymentStatus =>
  PAYMENT_STATUSES.includes(s as PaymentStatus)

export const isValidFulfillmentStatus = (s: string): s is FulfillmentStatus =>
  FULFILLMENT_STATUSES.includes(s as FulfillmentStatus)
```

### 6. Audit Trail (`src/lib/audit/trail.ts`)

Unified status change recording.

```typescript
type AuditField = 'status' | 'paymentStatus' | 'fulfillmentStatus'

interface AuditEntry {
  orderId: string
  field: AuditField
  previousValue: string
  newValue: string
  changedBy: string | 'system' | 'webhook'
  reason?: string
}

export const recordChange = async (entry: AuditEntry) => {
  await db.insert(orderHistory).values({
    ...entry,
    changedAt: new Date(),
  })
}

export const recordStatusChange = (
  orderId: string,
  previous: OrderStatus,
  next: OrderStatus,
  changedBy: string,
  reason?: string,
) =>
  recordChange({
    orderId,
    field: 'status',
    previousValue: previous,
    newValue: next,
    changedBy,
    reason,
  })

export const recordPaymentChange = (
  orderId: string,
  previous: PaymentStatus,
  next: PaymentStatus,
  changedBy: string,
  reason?: string,
) =>
  recordChange({
    orderId,
    field: 'paymentStatus',
    previousValue: previous,
    newValue: next,
    changedBy,
    reason,
  })
```

### 7. Webhook Processing (`src/lib/audit/webhooks.ts`)

Shared webhook pipeline replacing ~150 lines of duplicate logic.

```typescript
interface WebhookContext {
  provider: 'stripe' | 'paypal'
  eventId: string
  eventType: string
  orderId: string
}

interface WebhookResult {
  success: boolean
  error?: string
  skipped?: boolean
}

export const processWebhook = async (
  ctx: WebhookContext,
  handler: () => Promise<void>,
): Promise<WebhookResult> => {
  const processed = await isWebhookProcessed(ctx.eventId)
  if (processed) return { success: true, skipped: true }

  await markWebhookProcessing(ctx.eventId, ctx.provider)

  try {
    await handler()
    await markWebhookCompleted(ctx.eventId)
    return { success: true }
  } catch (error) {
    await markWebhookFailed(ctx.eventId, error)
    return { success: false, error: String(error) }
  }
}

export const updateOrderFromWebhook = async (
  orderId: string,
  updates: { paymentStatus?: PaymentStatus; status?: OrderStatus },
  provider: 'stripe' | 'paypal',
) => {
  const order = await findById(orders, orderId)
  if (!order) throw new Error('Order not found')

  const changes = buildUpdate(order, updates)
  await db.update(orders).set(changes).where(eq(orders.id, orderId))

  if (updates.paymentStatus && updates.paymentStatus !== order.paymentStatus) {
    await recordPaymentChange(
      orderId,
      order.paymentStatus,
      updates.paymentStatus,
      'webhook',
    )
  }
  if (updates.status && updates.status !== order.status) {
    await recordStatusChange(orderId, order.status, updates.status, 'webhook')
  }
}
```

### 8. Common Utilities

#### Date Formatting (`src/lib/utils/date.ts`)

```typescript
export const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

export const formatDateTime = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const formatRelative = (date: Date | string) => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export const getSessionExpiry = (days = 7) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000)
```

#### Currency Helpers (`src/lib/utils/currency.ts`)

```typescript
export const formatPrice = (
  amount: number,
  currency = 'USD',
  locale = 'en-US',
) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

export const centsToDecimal = (cents: number) => cents / 100

export const decimalToCents = (decimal: number) => Math.round(decimal * 100)

export const parseDecimal = (value: string | number) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return Math.round(parsed * 100) / 100
}

export const sumPrices = (items: { price: number; quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
```

#### Session Utilities (`src/lib/utils/session.ts`)

```typescript
export const getCookie = (request: Request, name: string): string | null => {
  const cookies = request.headers.get('cookie')
  if (!cookies) return null

  const match = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))

  return match ? match.split('=')[1] : null
}

export const createSessionCookie = (
  sessionId: string,
  maxAge = 7 * 24 * 60 * 60,
) =>
  `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

export const clearSessionCookie = () =>
  `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
```

## Impact Summary

| Category                    | Duplicates Found | Lines Saved Per Instance |
| --------------------------- | ---------------- | ------------------------ |
| API auth checks             | 22               | 10-15                    |
| Response construction       | 31               | 3-5                      |
| Database single-row fetches | 16               | 4-6                      |
| Status validation           | 4-6              | 2-3                      |
| Session creation            | 3                | 3-4                      |
| Webhook processing          | 2                | 60-80                    |
| Status change recording     | 5+               | 6-8                      |
| Date formatting             | 5+               | 3-4                      |

**Estimated total reduction: 500-700 lines of duplicate code**

## Migration Strategy

1. Create utility files first (non-breaking)
2. Add tests for new utilities
3. Migrate routes one at a time, starting with simplest
4. Run existing tests after each migration
5. Remove old duplicate code once all routes migrated
