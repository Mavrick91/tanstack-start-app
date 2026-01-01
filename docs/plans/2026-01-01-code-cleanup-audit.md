# Code Cleanup Audit: Redundant Types & Useless Comments

**Date:** 2026-01-01
**Scope:** Full codebase - remove redundant type annotations and useless comments
**Goal:** Cleaner, more readable code without losing type safety

---

## Executive Summary

| Category                 | Count     | Impact                            |
| ------------------------ | --------- | --------------------------------- |
| Redundant return types   | 30+       | Cleaner function signatures       |
| Redundant generic params | 10+       | Simpler collection initialization |
| Redundant array types    | 8+        | Less boilerplate                  |
| Section dividers         | ~66 lines | Removes visual clutter            |
| Redundant JSDoc          | 8         | Removes obvious comments          |
| Obvious inline comments  | 3         | Cleaner code                      |
| Dead code (inventory)    | 2 lines   | Removes unused feature            |

---

## Part 1: Redundant Type Annotations

### 1.1 Return Types on Simple Functions

Remove explicit return types where TypeScript infers correctly:

#### `src/lib/csrf.ts`

```typescript
// Line 3: Remove `: string`
- const getCsrfSecret = (): string => {
+ const getCsrfSecret = () => {

// Line 14: Remove `: string`
- export const generateCsrfToken = (): string => {
+ export const generateCsrfToken = () => {

// Line 22: Remove `: string`
- export const generateSessionCsrfToken = (sessionId: string): string => {
+ export const generateSessionCsrfToken = (sessionId: string) => {

// Line 99: Remove `: string`
- export const createCsrfCookie = (token: string): string => {
+ export const createCsrfCookie = (token: string) => {
```

#### `src/lib/checkout-auth.ts`

```typescript
// Line 9: Remove `: string`
- const getCheckoutSecret = (): string => {
+ const getCheckoutSecret = () => {

// Line 23: Remove `: string`
- export const generateCheckoutToken = (checkoutId: string): string => {
+ export const generateCheckoutToken = (checkoutId: string) => {

// Line 133: Remove `: string`
- export const clearCheckoutIdCookie = (): string => {
+ export const clearCheckoutIdCookie = () => {
```

#### `src/lib/tax.ts`

```typescript
// Line 4: Remove `: number`
- export const getTaxRate = (): number => {
+ export const getTaxRate = () => {

// Line 21: Remove `: string`
- export const formatTaxAmount = (amount: number): string => {
+ export const formatTaxAmount = (amount: number) => {
```

#### `src/lib/utils.ts`

```typescript
// Line 6: Remove `: string`
- export const cn = (...inputs: Array<ClassValue>): string => {
+ export const cn = (...inputs: Array<ClassValue>) => {
```

#### `src/lib/rate-limit.ts`

```typescript
// Line 79: Remove `: string`
- export const getRateLimitKey = (request: Request): string => {
+ export const getRateLimitKey = (request: Request) => {

// Line 101: Remove `: Response`
- export const rateLimitResponse = (retryAfter: number): Response => {
+ export const rateLimitResponse = (retryAfter: number) => {
```

#### `src/lib/cart.ts`

```typescript
// Line 11: Remove `: CartTotals`
- export const calculateCartTotals = (items: Array<CartItem>): CartTotals => {
+ export const calculateCartTotals = (items: Array<CartItem>) => {
```

#### `src/lib/email-worker.ts`

```typescript
// Line 35: Remove `: Worker`
- export const startEmailWorker = (): Worker => {
+ export const startEmailWorker = () => {
```

#### `src/routes/admin/_authed/products/new.tsx`

```typescript
// Line 8: Remove `: void`
- const handleBack = (): void => {
+ const handleBack = () => {
```

#### `src/routes/admin/_authed/products/index.tsx`

```typescript
// Line 102: Remove `: void`
- const handleClearFilters = (): void => {
+ const handleClearFilters = () => {
```

#### `src/routes/$lang/account/addresses.tsx`

```typescript
// Line 96: Remove `: void`
- const handleSubmitClick = (): void => {
+ const handleSubmitClick = () => {
```

#### `src/routes/$lang/account/orders.tsx`

```typescript
// Line 35: Remove `: string`
- const formatDate = (date: Date | string): string => {
+ const formatDate = (date: Date | string) => {
```

---

### 1.2 Generic Parameters on Collections

Remove explicit generics when TypeScript infers from usage:

#### `src/server/orders.ts`

```typescript
// Line 94
- const countMap = new Map<string, number>()
+ const countMap = new Map()
```

#### `src/server/products.ts`

```typescript
// Line 427
- const firstImageByProduct = new Map<string, string>()
+ const firstImageByProduct = new Map()

// Line 909
- const imagesByProductId = new Map<string, string>()
+ const imagesByProductId = new Map()
```

#### `src/server/checkout.ts`

```typescript
// Line 144
- const imageMap = new Map<string, string>()
+ const imageMap = new Map()
```

#### `src/server/collections.ts`

```typescript
// Line 223
- const firstImageByProduct = new Map<string, string>()
+ const firstImageByProduct = new Map()
```

#### Test files

```typescript
// src/components/admin/collections/components/CollectionTable.test.tsx:77
// src/components/admin/products/components/ProductTable.test.tsx:67
- selectedIds: new Set<string>()
+ selectedIds: new Set()
```

---

### 1.3 Empty Array Type Annotations

Remove when type is inferred from `.push()` calls:

#### `src/routes/api/orders/index.ts`

```typescript
// Line 47
- const conditions: SQL[] = []
+ const conditions = []
```

#### `src/lib/cloudinary.ts`

```typescript
// Line 78
- const transforms: string[] = []
+ const transforms = []
```

#### `src/components/admin/media/MediaLibrary.tsx`

```typescript
// Line 77
- const uploadedIds: string[] = []
+ const uploadedIds = []
```

#### `src/components/ui/fn-form.tsx`

```typescript
// Line 103
- const fields: FieldDefinition[] = []
+ const fields = []
```

#### `src/lib/env.ts`

```typescript
// Line 31
- const missing: string[] = []
+ const missing = []
```

#### `src/components/admin/products/ProductForm.tsx`

```typescript
// Line 878
- const result: ProductVariant[] = []
+ const result = []
```

---

### 1.4 Record Type Patterns

Simplify reduce accumulator patterns:

#### `src/routes/api/auth/logout.ts`

```typescript
// Line 19
;(-{} as Record<string, string>) + {}
```

#### `src/lib/auth.ts`

```typescript
// Line 42
;(-{} as Record<string, string>) + {}
```

#### `src/components/checkout/AddressForm.tsx`

```typescript
// Line 38
;(-{} as Record<string, string>) + {}
```

#### `src/components/ui/fn-form.tsx`

```typescript
// Line 139
;(-{} as Record<string, unknown>) + {}
```

#### `src/lib/security-headers.ts`

```typescript
// Lines 4, 15 - Remove explicit typing
- export const securityHeaders: Record<string, string> = {
+ export const securityHeaders = {

- export const cspHeader: Record<string, string> = {
+ export const cspHeader = {
```

---

## Part 2: Useless Comments

### 2.1 Section Dividers to Remove

Delete all decorative divider comments:

#### `src/server/orders.ts` - Remove lines:

- 21-23, 50-52, 72-74, 174-176, 217-219, 362-364, 450-452

#### `src/server/checkout.ts` - Remove lines:

- 43-45, 89-91, 238-240, 332-334, 426-428, 512-514, 630-632, 923-925

#### `src/db/schema.ts` - Remove lines:

- 15-17, 37-39, 108-110, 140-142, 171-173, 384-386, 399-401

#### `src/test/helpers/db-test.ts` - Remove lines:

- 91-93

---

### 2.2 Redundant JSDoc Comments

Remove comments that restate the function name:

#### `src/lib/cart.ts`

```typescript
// Remove lines 8-10
- /**
-  * Calculates total items and total price for a given set of cart items.
-  */
  export const calculateCartTotals = (items: Array<CartItem>) => {
```

#### `src/lib/format.ts`

```typescript
// Remove lines 1-3
- /**
-  * Formats a number as a currency string.
-  */
  export const formatCurrency = (amount: number, currency = 'USD') => {
```

#### `src/lib/auth.ts`

```typescript
// Remove lines 8-10
- /**
-  * Hash a password using bcrypt
-  */
  export const hashPassword = async (password: string) => {

// Remove lines 15-17
- /**
-  * Verify a password against a hash
-  */
  export const verifyPassword = async (password: string, hash: string) => {

// Remove lines 25-27
- /**
-  * Parse cookies from request header, handling values with '=' characters
-  */
  export const getCookie = (request: Request, name: string) => {

// Remove lines 48-50
- /**
-  * Validate session and return user if authenticated
-  */
  export const validateSession = async (request: Request) => {
```

#### `src/server/orders.ts`

```typescript
// Remove lines 54-56 (JSDoc) and 59, 61 (inline comments)
- /**
-  * Safely convert decimal string to number preserving precision
-  * Uses fixed-point arithmetic to avoid floating-point errors
-  */
  export const parseDecimal = (value: string) => {
-   // Parse as string, then convert to number with fixed precision
    const parsed = parseFloat(value)
-   // Round to 2 decimal places to avoid floating-point representation issues
    return Math.round(parsed * 100) / 100
  }

// Remove lines 65-67
- /**
-  * Format number to decimal string for database storage
-  */
  export const toDecimalString = (value: number) => {

// Remove lines 76-78
- /**
-  * Get item counts for multiple orders in a single query
-  * Fixes N+1 query problem in order listing
-  */
  export const getOrderItemCounts = async (orderIds: string[]) => {
```

---

### 2.3 Dead Code to Remove

#### `src/server/products.ts`

```typescript
// Remove lines 453-454 entirely (no inventory feature)
- // TODO: Add inventory tracking
- const totalInventory = 0
```

Also remove any references to `totalInventory` in the return statement if present.

---

## Implementation Checklist

### Phase 1: Types Cleanup

- [ ] `src/lib/csrf.ts` - Remove 4 return types
- [ ] `src/lib/checkout-auth.ts` - Remove 3 return types
- [ ] `src/lib/tax.ts` - Remove 2 return types
- [ ] `src/lib/utils.ts` - Remove 1 return type
- [ ] `src/lib/rate-limit.ts` - Remove 2 return types
- [ ] `src/lib/cart.ts` - Remove 1 return type
- [ ] `src/lib/email-worker.ts` - Remove 1 return type
- [ ] `src/routes/admin/_authed/products/*.tsx` - Remove void types
- [ ] `src/routes/$lang/account/*.tsx` - Remove return types
- [ ] `src/server/*.ts` - Remove Map generic params
- [ ] Various files - Remove array type annotations
- [ ] Various files - Simplify Record patterns

### Phase 2: Comments Cleanup

- [ ] `src/server/orders.ts` - Remove 8 dividers + 3 JSDoc + 2 inline
- [ ] `src/server/checkout.ts` - Remove 8 dividers
- [ ] `src/db/schema.ts` - Remove 7 dividers
- [ ] `src/lib/auth.ts` - Remove 4 JSDoc comments
- [ ] `src/lib/cart.ts` - Remove 1 JSDoc comment
- [ ] `src/lib/format.ts` - Remove 1 JSDoc comment
- [ ] `src/test/helpers/db-test.ts` - Remove 1 divider

### Phase 3: Dead Code

- [ ] `src/server/products.ts` - Remove inventory TODO and variable

---

## Notes

- Run `npm run typecheck` after each file to verify no type errors introduced
- Run `npm run lint` to catch any issues
- These changes are safe - TypeScript will still infer correct types
- Total estimated lines removed: ~100+
