# Code Quality Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate duplicate checkout hooks, fix N+1 database queries, and align error handling with TanStack best practices.

**Architecture:** Three independent refactors executed in risk order. Checkout hooks consolidation is isolated. Database queries extract shared utility. Error handling inlines business logic into server functions with direct throws.

**Tech Stack:** TanStack Start, React Query, Zustand, Drizzle ORM, Zod, Vitest

---

## Phase 1: Checkout Hooks Consolidation

### Task 1.1: Update checkout/index.tsx to use new store

**Files:**
- Modify: `src/routes/$lang/checkout/index.tsx`

**Step 1: Update import and usage**

Replace the entire file content:

```typescript
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { useCartStore } from '../../../hooks/useCart'
import { useCheckoutIdStore } from '../../../hooks/useCheckoutQueries'

const CheckoutIndexPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const checkoutId = useCheckoutIdStore((s) => s.checkoutId)
  const cartItems = useCartStore((state) => state.items)

  useEffect(() => {
    // If we have an existing checkout, go to information step
    if (checkoutId) {
      navigate({ to: '/$lang/checkout/information', params: { lang } })
      return
    }

    // If cart is empty, redirect to home
    if (cartItems.length === 0) {
      navigate({ to: '/$lang', params: { lang } })
      return
    }

    // Otherwise, redirect to information step (it will create checkout)
    navigate({ to: '/$lang/checkout/information', params: { lang } })
  }, [checkoutId, cartItems, navigate, lang])

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
    </div>
  )
}

export const Route = createFileRoute('/$lang/checkout/')({
  component: CheckoutIndexPage,
})
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All 1126 tests pass

**Step 4: Commit**

```bash
git add src/routes/\$lang/checkout/index.tsx
git commit -m "refactor(checkout): update index to use useCheckoutIdStore"
```

---

### Task 1.2: Delete old useCheckout hook

**Files:**
- Delete: `src/hooks/useCheckout.ts`
- Delete: `src/hooks/useCheckout.test.ts`

**Step 1: Delete old hook files**

```bash
rm src/hooks/useCheckout.ts
rm src/hooks/useCheckout.test.ts
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors (no other files import useCheckout.ts)

**Step 3: Run tests**

Run: `npm test`
Expected: Tests pass (count will decrease by ~28 tests from deleted test file)

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(checkout): remove duplicate useCheckout hook"
```

---

### Task 1.3: Rename useCheckoutQueries to useCheckout

**Files:**
- Rename: `src/hooks/useCheckoutQueries.ts` → `src/hooks/useCheckout.ts`
- Rename: `src/hooks/useCheckoutQueries.test.ts` → `src/hooks/useCheckout.test.ts`
- Modify: `src/routes/$lang/checkout/information.tsx`
- Modify: `src/routes/$lang/checkout/shipping.tsx`
- Modify: `src/routes/$lang/checkout/payment.tsx`
- Modify: `src/routes/$lang/checkout/index.tsx`

**Step 1: Rename files**

```bash
git mv src/hooks/useCheckoutQueries.ts src/hooks/useCheckout.ts
git mv src/hooks/useCheckoutQueries.test.ts src/hooks/useCheckout.test.ts
```

**Step 2: Update imports in checkout/index.tsx**

Change line 6 from:
```typescript
import { useCheckoutIdStore } from '../../../hooks/useCheckoutQueries'
```
To:
```typescript
import { useCheckoutIdStore } from '../../../hooks/useCheckout'
```

**Step 3: Update imports in checkout/information.tsx**

Change lines 27-32 from:
```typescript
import {
  checkoutKeys,
  useCheckout,
  useCheckoutIdStore,
  useCreateCheckout,
  useSaveCustomerInfo,
} from '../../../hooks/useCheckoutQueries'
```
To:
```typescript
import {
  checkoutKeys,
  useCheckout,
  useCheckoutIdStore,
  useCreateCheckout,
  useSaveCustomerInfo,
} from '../../../hooks/useCheckout'
```

**Step 4: Update imports in checkout/shipping.tsx**

Change lines 24-28 from:
```typescript
import {
  useCheckout,
  useCheckoutIdStore,
  useSaveShippingAddress,
  useShippingRates,
} from '../../../hooks/useCheckoutQueries'
```
To:
```typescript
import {
  useCheckout,
  useCheckoutIdStore,
  useSaveShippingAddress,
  useShippingRates,
} from '../../../hooks/useCheckout'
```

**Step 5: Update imports in checkout/payment.tsx**

Change lines 29-34 from:
```typescript
import {
  useCheckout,
  useCheckoutIdStore,
  useCompleteCheckout,
  useCreateStripePaymentIntent,
  useSaveShippingMethod,
} from '../../../hooks/useCheckoutQueries'
```
To:
```typescript
import {
  useCheckout,
  useCheckoutIdStore,
  useCompleteCheckout,
  useCreateStripePaymentIntent,
  useSaveShippingMethod,
} from '../../../hooks/useCheckout'
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 7: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor(checkout): rename useCheckoutQueries to useCheckout"
```

---

## Phase 2: Database Query Optimization

### Task 2.1: Create product-queries utility

**Files:**
- Create: `src/server/lib/product-queries.ts`

**Step 1: Create the utility file**

```typescript
import { asc, inArray } from 'drizzle-orm'

import { db } from '../../db'
import {
  productImages,
  productOptions,
  productVariants,
} from '../../db/schema'

type ProductImage = typeof productImages.$inferSelect
type ProductVariant = typeof productVariants.$inferSelect
type ProductOption = typeof productOptions.$inferSelect

export interface ProductRelations {
  images: Map<string, ProductImage[]>
  firstImage: Map<string, string>
  variants: Map<string, ProductVariant[]>
  firstVariant: Map<string, ProductVariant>
  options: Map<string, ProductOption[]>
}

/**
 * Batch fetch all related data for a list of products.
 * Avoids N+1 queries by fetching all relations in 3 parallel queries.
 */
export async function fetchProductRelations(
  productIds: string[],
): Promise<ProductRelations> {
  if (productIds.length === 0) {
    return {
      images: new Map(),
      firstImage: new Map(),
      variants: new Map(),
      firstVariant: new Map(),
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

  // Group images by product ID
  const imagesByProduct = new Map<string, ProductImage[]>()
  const firstImageByProduct = new Map<string, string>()
  for (const img of images) {
    if (!imagesByProduct.has(img.productId)) {
      imagesByProduct.set(img.productId, [])
      firstImageByProduct.set(img.productId, img.url)
    }
    imagesByProduct.get(img.productId)!.push(img)
  }

  // Group variants by product ID
  const variantsByProduct = new Map<string, ProductVariant[]>()
  const firstVariantByProduct = new Map<string, ProductVariant>()
  for (const v of variants) {
    if (!variantsByProduct.has(v.productId)) {
      variantsByProduct.set(v.productId, [])
      firstVariantByProduct.set(v.productId, v)
    }
    variantsByProduct.get(v.productId)!.push(v)
  }

  // Group options by product ID
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
    firstVariant: firstVariantByProduct,
    options: optionsByProduct,
  }
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/lib/product-queries.ts
git commit -m "feat(products): add batch product relations utility"
```

---

### Task 2.2: Refactor getProductsFn to use batch utility

**Files:**
- Modify: `src/server/products.ts`

**Step 1: Add import at top of file (after line 5)**

Add after existing imports:
```typescript
import { fetchProductRelations } from './lib/product-queries'
```

**Step 2: Replace getProductsFn implementation (lines 71-125)**

Replace the entire `getProductsFn` with:

```typescript
export const getProductsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    if (!request) throw new Error('No request found')

    const auth = await validateSession(request)
    if (!auth.success) {
      throw new Error(auth.error || 'Unauthorized')
    }

    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))

    const productIds = allProducts.map((p) => p.id)
    const relations = await fetchProductRelations(productIds)

    const productsWithData = allProducts.map((product) => {
      const variants = relations.variants.get(product.id) || []
      const options = relations.options.get(product.id) || []
      const firstVariant = relations.firstVariant.get(product.id)

      return {
        ...product,
        image: relations.firstImage.get(product.id) || null,
        price: firstVariant?.price || null,
        variants,
        options,
      }
    })

    return { success: true, data: productsWithData }
  },
)
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/server/products.ts
git commit -m "refactor(products): use batch query in getProductsFn"
```

---

### Task 2.3: Refactor getAdminProductsFn to use batch utility

**Files:**
- Modify: `src/server/products.ts`

**Step 1: Replace getAdminProductsFn implementation (lines 411-458)**

Replace the entire `getAdminProductsFn` with:

```typescript
// Get all products for admin list
export const getAdminProductsFn = createServerFn().handler(async () => {
  await requireAdmin()

  const allProducts = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))

  const productIds = allProducts.map((p) => p.id)
  const relations = await fetchProductRelations(productIds)

  const productsWithData = allProducts.map((product) => {
    const variants = relations.variants.get(product.id) || []

    // Calculate price range
    const prices = variants
      .map((v) => parseFloat(v.price))
      .filter((p) => !isNaN(p))
    const minPrice = prices.length > 0 ? Math.min(...prices) : null
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null

    // TODO: Add inventory tracking
    const totalInventory = 0

    return {
      ...product,
      imageUrl: relations.firstImage.get(product.id),
      variantCount: variants.length,
      minPrice,
      maxPrice,
      totalInventory,
      price: variants[0]?.price ?? '0',
    }
  })

  return productsWithData
})
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/products.ts
git commit -m "refactor(products): use batch query in getAdminProductsFn"
```

---

### Task 2.4: Refactor getProductByIdFn to use batch utility

**Files:**
- Modify: `src/server/products.ts`

**Step 1: Replace getProductByIdFn implementation (lines 550-588)**

Replace the entire `getProductByIdFn` with:

```typescript
// Get single product by ID with all related data
export const getProductByIdFn = createServerFn()
  .inputValidator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    await requireAdmin()

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))

    if (!product) {
      throw new Error('Product not found')
    }

    const relations = await fetchProductRelations([data.productId])

    return {
      product: {
        ...product,
        images: relations.images.get(data.productId) || [],
        options: relations.options.get(data.productId) || [],
        variants: relations.variants.get(data.productId) || [],
      },
    }
  })
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/products.ts
git commit -m "refactor(products): use batch query in getProductByIdFn"
```

---

### Task 2.5: Clean up unused imports in products.ts

**Files:**
- Modify: `src/server/products.ts`

**Step 1: Remove unused asc import from productImages/productOptions/productVariants queries**

The `asc` import is still used by other functions, but now we can remove individual query imports that are no longer directly used in products.ts. Check if all direct queries to `productImages`, `productOptions`, `productVariants` outside the utility are still needed.

After reviewing - keep all imports as they're still used in:
- `deleteProductFn` (productImages)
- `duplicateProductFn` (productImages, productOptions, productVariants)
- `bulkUpdateProductsFn` (productImages)
- `updateProductFn` (productOptions, productVariants)
- `updateProductImagesFn` (productImages)
- `getProductsListFn` (productImages, productVariants)

**Step 2: Run tests to verify no regressions**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit (if any changes made)**

```bash
git add src/server/products.ts
git commit -m "refactor(products): clean up after batch query migration"
```

---

## Phase 3: Error Handling Standardization

### Task 3.1: Inline createCheckout logic into server function

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Add json import at top of file**

Add to imports (line 1-5 area):
```typescript
import { json } from '@tanstack/react-start'
```

**Step 2: Replace createCheckoutFn (lines 651-660)**

Replace with inlined logic:

```typescript
// Create checkout server function
export const createCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(createCheckoutInputSchema.parse)
  .handler(async ({ data }) => {
    const { items, currency = 'USD' } = data

    // Get all product and variant data
    const productIds = [...new Set(items.map((item) => item.productId))]
    const variantIds = items
      .filter((item) => item.variantId)
      .map((item) => item.variantId!)

    const productsData = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds))

    const variantsData =
      variantIds.length > 0
        ? await db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
        : await db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, productIds))
            .orderBy(asc(productVariants.position))

    // Get first image for each product
    const imagesData = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position))

    const productMap = new Map(productsData.map((p) => [p.id, p]))
    const variantMap = new Map(variantsData.map((v) => [v.id, v]))
    const imageMap = new Map<string, string>()
    for (const img of imagesData) {
      if (!imageMap.has(img.productId)) {
        imageMap.set(img.productId, img.url)
      }
    }

    // Build cart items with full details
    const cartItems: CheckoutCartItem[] = []
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 },
        )
      }

      let variant = item.variantId ? variantMap.get(item.variantId) : null

      // If no specific variant, get first variant for this product
      if (!variant) {
        variant = variantsData.find((v) => v.productId === item.productId)
      }

      if (!variant) {
        throw json(
          { error: `Variant not found for product: ${item.productId}` },
          { status: 404 },
        )
      }

      const productName = (product.name as LocalizedString).en

      cartItems.push({
        productId: item.productId,
        variantId: variant.id,
        quantity: item.quantity,
        title: productName,
        variantTitle:
          variant.title !== 'Default Title' ? variant.title : undefined,
        sku: variant.sku || undefined,
        price: parseFloat(variant.price),
        imageUrl: imageMap.get(item.productId),
      })
    }

    // Calculate totals
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )

    // Default shipping (standard rate or free if over threshold)
    const defaultShippingRate =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATES[0].price
    const shippingTotal = defaultShippingRate

    const taxTotal = calculateTax(subtotal)
    const total = subtotal + shippingTotal + taxTotal

    // Create checkout session (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const [checkout] = await db
      .insert(checkouts)
      .values({
        cartItems,
        subtotal: subtotal.toFixed(2),
        shippingTotal: shippingTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        currency,
        expiresAt,
      })
      .returning()

    return {
      checkout: {
        id: checkout.id,
        cartItems: checkout.cartItems as CheckoutCartItem[],
        subtotal: parseFloat(checkout.subtotal),
        shippingTotal: parseFloat(checkout.shippingTotal || '0'),
        taxTotal: parseFloat(checkout.taxTotal || '0'),
        total: parseFloat(checkout.total),
        currency: checkout.currency,
        expiresAt: checkout.expiresAt,
      },
    }
  })
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): inline createCheckout with TanStack error pattern"
```

---

### Task 3.2: Inline saveCustomerInfo logic

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Replace saveCustomerInfoFn (lines 744-762)**

Replace with inlined logic:

```typescript
// Save customer info server function
export const saveCustomerInfoFn = createServerFn({ method: 'POST' })
  .inputValidator(saveCustomerInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, email, firstName, lastName } = data

    // Get checkout
    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.completedAt) {
      throw json({ error: 'Checkout already completed' }, { status: 410 })
    }

    if (checkout.expiresAt < new Date()) {
      throw json({ error: 'Checkout expired' }, { status: 410 })
    }

    const normalized = normalizeEmail(email)
    let customerId = checkout.customerId

    if (!customerId) {
      // Check for existing customer
      const [existingCustomer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, normalized))
        .limit(1)

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create new guest customer
        const [newCustomer] = await db
          .insert(customers)
          .values({
            email: normalized,
            firstName: firstName?.trim() || null,
            lastName: lastName?.trim() || null,
          })
          .returning()

        customerId = newCustomer.id
      }
    }

    // Update checkout with customer info
    const [updatedCheckout] = await db
      .update(checkouts)
      .set({
        customerId,
        email: normalized,
        updatedAt: new Date(),
      })
      .where(eq(checkouts.id, checkoutId))
      .returning()

    return {
      checkout: {
        id: updatedCheckout.id,
        email: updatedCheckout.email!,
        customerId: updatedCheckout.customerId,
      },
    }
  })
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): inline saveCustomerInfo with TanStack error pattern"
```

---

### Task 3.3: Inline saveShippingAddress logic

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Replace saveShippingAddressFn (lines 764-777)**

Replace with inlined logic:

```typescript
// Save shipping address server function
export const saveShippingAddressFn = createServerFn({ method: 'POST' })
  .inputValidator(saveShippingAddressInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, address } = data

    // Get checkout
    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.completedAt) {
      throw json({ error: 'Checkout already completed' }, { status: 410 })
    }

    if (checkout.expiresAt < new Date()) {
      throw json({ error: 'Checkout expired' }, { status: 410 })
    }

    // Update checkout with shipping address
    const [updatedCheckout] = await db
      .update(checkouts)
      .set({
        shippingAddress: address,
        updatedAt: new Date(),
      })
      .where(eq(checkouts.id, checkoutId))
      .returning()

    return {
      checkout: {
        id: updatedCheckout.id,
        shippingAddress: updatedCheckout.shippingAddress!,
      },
    }
  })
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): inline saveShippingAddress with TanStack error pattern"
```

---

### Task 3.4: Inline saveShippingMethod logic

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Replace saveShippingMethodFn (lines 779-792)**

Replace with inlined logic:

```typescript
// Save shipping method server function
export const saveShippingMethodFn = createServerFn({ method: 'POST' })
  .inputValidator(saveShippingMethodInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, shippingRateId } = data

    // Get checkout
    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.completedAt) {
      throw json({ error: 'Checkout already completed' }, { status: 410 })
    }

    if (!checkout.shippingAddress) {
      throw json({ error: 'Shipping address required first' }, { status: 400 })
    }

    // Find shipping rate
    const rate = SHIPPING_RATES.find((r) => r.id === shippingRateId)
    if (!rate) {
      throw json({ error: 'Invalid shipping rate' }, { status: 400 })
    }

    // Recalculate total
    const subtotal = parseFloat(checkout.subtotal)
    const taxTotal = parseFloat(checkout.taxTotal || '0')
    const shippingTotal = rate.price
    const total = subtotal + taxTotal + shippingTotal

    // Update checkout
    const [updatedCheckout] = await db
      .update(checkouts)
      .set({
        shippingRateId,
        shippingMethod: rate.name,
        shippingTotal: shippingTotal.toFixed(2),
        total: total.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(checkouts.id, checkoutId))
      .returning()

    return {
      checkout: {
        id: updatedCheckout.id,
        shippingRateId: updatedCheckout.shippingRateId!,
        shippingMethod: updatedCheckout.shippingMethod!,
        shippingTotal: parseFloat(updatedCheckout.shippingTotal || '0'),
        total: parseFloat(updatedCheckout.total),
      },
    }
  })
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): inline saveShippingMethod with TanStack error pattern"
```

---

### Task 3.5: Inline completeCheckout logic

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Replace completeCheckoutFn (lines 794-811)**

Replace with inlined logic:

```typescript
// Complete checkout server function
export const completeCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(completeCheckoutInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, paymentProvider, paymentId } = data

    // Get checkout
    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.completedAt) {
      throw json({ error: 'Checkout already completed' }, { status: 410 })
    }

    if (!checkout.email) {
      throw json({ error: 'Customer email required' }, { status: 400 })
    }

    if (!checkout.shippingAddress) {
      throw json({ error: 'Shipping address required' }, { status: 400 })
    }

    if (!checkout.shippingRateId) {
      throw json({ error: 'Shipping method required' }, { status: 400 })
    }

    // Create order in transaction
    const result = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: checkout.customerId,
          email: checkout.email!,
          subtotal: checkout.subtotal,
          shippingTotal: checkout.shippingTotal || '0',
          taxTotal: checkout.taxTotal || '0',
          total: checkout.total,
          currency: checkout.currency,
          status: 'pending',
          paymentStatus: 'paid',
          fulfillmentStatus: 'unfulfilled',
          shippingMethod: checkout.shippingMethod,
          shippingAddress: checkout.shippingAddress!,
          billingAddress: checkout.billingAddress || checkout.shippingAddress!,
          paymentProvider,
          paymentId,
          paidAt: new Date(),
        })
        .returning()

      // Create order items
      const cartItems = checkout.cartItems as CheckoutCartItem[]
      await tx.insert(orderItems).values(
        cartItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          variantTitle: item.variantTitle,
          sku: item.sku,
          price: String(item.price),
          quantity: item.quantity,
          total: String(item.price * item.quantity),
          imageUrl: item.imageUrl,
        })),
      )

      // Mark checkout as completed
      await tx
        .update(checkouts)
        .set({
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(checkouts.id, checkoutId))

      return order
    })

    return {
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        email: result.email,
        total: parseFloat(result.total),
      },
    }
  })
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): inline completeCheckout with TanStack error pattern"
```

---

### Task 3.6: Remove unused wrapper functions from checkout.ts

**Files:**
- Modify: `src/server/checkout.ts`

**Step 1: Remove the following functions that are now inlined**

Remove these function blocks (they're no longer called):
- `createCheckout` (lines 76-208)
- `saveCustomerInfo` (lines 230-299)
- `saveShippingAddress` (lines 331-390)
- `saveShippingMethod` (lines 412-473)
- `completeCheckout` (lines 495-588)

Also remove associated types that are no longer needed:
- `CreateCheckoutResult` (lines 52-64)
- `CheckoutError` (lines 66-70)
- `SaveCustomerResult` (lines 221-228)
- `SaveShippingAddressResult` (lines 323-329)
- `SaveShippingMethodResult` (lines 401-410)
- `CompleteCheckoutResult` (lines 485-493)

Keep the input types as they're still used:
- `CartItem`
- `CheckoutCartItem`
- `CreateCheckoutInput`
- `SaveCustomerInput`
- `ShippingAddressInput`
- `SaveShippingMethodInput`
- `CompleteCheckoutInput`

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/server/checkout.ts
git commit -m "refactor(checkout): remove unused wrapper functions"
```

---

### Task 3.7: Final verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors (warnings ok)

**Step 4: Create final summary commit**

```bash
git add -A
git commit -m "refactor: complete code quality improvements

- Consolidated checkout hooks (useCheckoutQueries → useCheckout)
- Fixed N+1 queries with batch fetchProductRelations utility
- Aligned error handling with TanStack direct throw pattern
- Removed duplicate code and unused wrapper functions"
```

---

## Success Criteria Checklist

- [ ] All tests pass after each phase
- [ ] Single `useCheckout` hook (React Query version)
- [ ] `fetchProductRelations` utility used in all product queries
- [ ] All checkout server functions use `throw json()` for errors
- [ ] No unused wrapper functions remain
- [ ] TypeScript compiles without errors
