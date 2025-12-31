# Code Quality Improvements Design

**Date:** 2025-12-31
**Status:** Approved

## Overview

This document outlines three code quality improvements to reduce duplication, align with TanStack best practices, and simplify the codebase.

---

## 1. Error Handling Standardization

### Problem

Mixed error handling patterns across server functions:

- Some functions return `{ success: false, error, status }` then convert to throws
- Some functions throw directly
- Unnecessary two-layer abstraction

### Solution: TanStack Direct Throw Pattern

**Before (current):**

```typescript
export const createCheckout = async (input) => {
  if (!items)
    return { success: false, error: 'Cart items required', status: 400 }
  return { success: true, checkout }
}

export const createCheckoutFn = createServerFn().handler(async ({ data }) => {
  const result = await createCheckout(data)
  if (!result.success) throw new Error(result.error)
  return { checkout: result.checkout }
})
```

**After (TanStack pattern):**

```typescript
import { json } from '@tanstack/react-start'

export const createCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(createCheckoutInputSchema.parse)
  .handler(async ({ data }) => {
    const { items, currency = 'USD' } = data

    if (!items?.length) {
      throw json({ error: 'Cart items are required' }, { status: 400 })
    }

    // Business logic directly in handler
    return { checkout }
  })
```

### Files to Update

- `src/server/checkout.ts` - Remove wrapper functions, inline logic
- `src/server/products.ts` - Standardize error throws
- `src/server/orders.ts` - Standardize error throws
- `src/server/collections.ts` - Standardize error throws
- `src/server/customers.ts` - Standardize error throws

### Guidelines

1. Use `throw json({ error }, { status })` for client errors (4xx)
2. Use `throw new Error()` for server errors (5xx)
3. Use `.inputValidator()` with Zod for input validation
4. Put business logic directly in server function handlers

---

## 2. Database Query Optimization

### Problem

N+1 query pattern repeated across multiple functions:

```typescript
// Current: Queries inside loop (N+1)
const productsWithData = await Promise.all(
  allProducts.map(async (product) => {
    const images = await db.select()...   // 1 query per product
    const variants = await db.select()... // 1 query per product
    const options = await db.select()...  // 1 query per product
  })
)
```

Correct batch pattern exists in `getProductsListFn` but not applied elsewhere.

### Solution: Extract Shared Query Utilities

**Create `src/server/lib/product-queries.ts`:**

```typescript
import { asc, inArray } from 'drizzle-orm'
import { db } from '../../db'
import { productImages, productVariants, productOptions } from '../../db/schema'

type ProductImage = typeof productImages.$inferSelect
type ProductVariant = typeof productVariants.$inferSelect
type ProductOption = typeof productOptions.$inferSelect

export interface ProductRelations {
  images: Map<string, ProductImage[]>
  firstImage: Map<string, string>
  variants: Map<string, ProductVariant[]>
  options: Map<string, ProductOption[]>
}

export async function fetchProductRelations(
  productIds: string[],
): Promise<ProductRelations> {
  if (productIds.length === 0) {
    return {
      images: new Map(),
      firstImage: new Map(),
      variants: new Map(),
      options: new Map(),
    }
  }

  const [images, variants, options] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .orderBy(asc(productVariants.position)),
    db
      .select()
      .from(productOptions)
      .where(inArray(productOptions.productId, productIds))
      .orderBy(asc(productOptions.position)),
  ])

  // Group by product ID
  const imagesByProduct = new Map<string, ProductImage[]>()
  const firstImageByProduct = new Map<string, string>()
  for (const img of images) {
    if (!imagesByProduct.has(img.productId)) {
      imagesByProduct.set(img.productId, [])
      firstImageByProduct.set(img.productId, img.url)
    }
    imagesByProduct.get(img.productId)!.push(img)
  }

  const variantsByProduct = new Map<string, ProductVariant[]>()
  for (const v of variants) {
    if (!variantsByProduct.has(v.productId)) {
      variantsByProduct.set(v.productId, [])
    }
    variantsByProduct.get(v.productId)!.push(v)
  }

  const optionsByProduct = new Map<string, ProductOption[]>()
  for (const o of options) {
    if (!optionsByProduct.has(o.productId)) {
      optionsByProduct.set(o.productId, [])
    }
    optionsByProduct.get(o.productId)!.push(o)
  }

  return {
    images: imagesByProduct,
    firstImage: firstImageByProduct,
    variants: variantsByProduct,
    options: optionsByProduct,
  }
}
```

### Functions to Refactor

- `getProductsFn` - Replace N+1 with `fetchProductRelations`
- `getAdminProductsFn` - Replace N+1 with `fetchProductRelations`
- `getProductByIdFn` - Use same utility (single ID array)
- `getProductsListFn` - Already correct, but can use shared utility

---

## 3. Checkout Hooks Consolidation

### Problem

Two hooks with overlapping functionality:

| Feature            | `useCheckout.ts`        | `useCheckoutQueries.ts` |
| ------------------ | ----------------------- | ----------------------- |
| State              | Zustand (full checkout) | Zustand (ID only)       |
| Fetching           | Manual loading/error    | React Query             |
| Optimistic updates | No                      | Yes                     |
| Cache              | No                      | Yes                     |

### Current Usage

- `checkout/index.tsx` → `useCheckoutStore` (old) - only for `checkoutId`
- `checkout/information.tsx` → `useCheckoutIdStore` + React Query (new)
- `checkout/shipping.tsx` → `useCheckoutIdStore` + React Query (new)
- `checkout/payment.tsx` → `useCheckoutIdStore` + React Query (new)

### Solution: Keep React Query version, delete old

**Steps:**

1. Delete `src/hooks/useCheckout.ts`
2. Delete `src/hooks/useCheckout.test.ts`
3. Rename `useCheckoutQueries.ts` → `useCheckout.ts`
4. Rename `useCheckoutQueries.test.ts` → `useCheckout.test.ts`
5. Update `checkout/index.tsx`:

   ```typescript
   // Before
   import { useCheckoutStore } from '../../../hooks/useCheckout'
   const { checkoutId } = useCheckoutStore()

   // After
   import { useCheckoutIdStore } from '../../../hooks/useCheckout'
   const checkoutId = useCheckoutIdStore((s) => s.checkoutId)
   ```

6. Update imports in information.tsx, shipping.tsx, payment.tsx
7. Update test imports

---

## Implementation Order

1. **Checkout hooks consolidation** (lowest risk, isolated change)
2. **Database query optimization** (performance improvement, isolated)
3. **Error handling standardization** (largest change, most files)

---

## Success Criteria

- [ ] All tests pass after each change
- [ ] No duplicate checkout hooks
- [ ] No N+1 queries in product fetching
- [ ] Consistent error handling using TanStack patterns
- [ ] TypeScript compiles without errors
