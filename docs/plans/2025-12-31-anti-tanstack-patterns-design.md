# Anti-TanStack Patterns Audit & Remediation Design

**Date:** 2025-12-31
**Status:** Draft

## Overview

This document identifies anti-TanStack patterns in the codebase and provides remediation strategies aligned with TanStack Start best practices.

---

## Anti-Patterns Identified

### 1. Client-Side Data Fetching Instead of Loaders

**Severity:** High

**Files affected:**
- `src/routes/$lang/account/orders.tsx:47-63`
- `src/routes/$lang/account/orders/$orderId.tsx:73-94`
- `src/routes/$lang/account/index.tsx:45-57`
- `src/routes/$lang/account/addresses.tsx:69-90`
- `src/routes/admin/_authed/orders/$orderId.tsx:32-63`
- `src/routes/admin/_authed/orders/index.tsx:76-126`

**Problem:**
Routes fetch data in `useEffect` hooks instead of using TanStack Router's `loader` functions. This causes:
- No SSR - users see loading spinners
- No data prefetching on hover/navigation
- Waterfall requests (auth check → then data fetch)
- Manual loading/error state management

**Solution:**
```typescript
export const Route = createFileRoute('/$lang/account/orders')({
  beforeLoad: async ({ params }) => {
    // Auth check - redirects if not logged in
  },
  loader: async () => {
    return { orders: await getCustomerOrdersFn() }
  },
  component: OrdersPage,
})

function OrdersPage() {
  const { orders } = Route.useLoaderData() // Type-safe, already loaded
}
```

---

### 2. Server State in Zustand

**Severity:** High

**Files affected:**
- `src/hooks/useCheckout.ts:32-61` - Stores full checkout object in Zustand + localStorage
- `src/hooks/useAuth.ts:17-77` - Stores user session in Zustand, manual `checkSession()` calls

**Problem:**
Using Zustand with localStorage persistence to store data that belongs on the server causes:
- Stale data - localStorage checkout may not match server state
- Hydration mismatches - Server renders one thing, client hydrates another
- Manual cache invalidation - Must remember to clear state
- Duplicated logic - Auth checked in multiple places via `useEffect`

**Solution:**
Only store references (IDs) locally, fetch actual data with React Query:
```typescript
// Only store the checkout ID locally (reference to server state)
export const useCheckoutIdStore = create(
  persist((set) => ({
    checkoutId: null,
    setCheckoutId: (id) => set({ checkoutId: id })
  }), { name: 'checkout-id' })
)

// Fetch actual data with React Query
export function useCheckout() {
  const checkoutId = useCheckoutIdStore((s) => s.checkoutId)
  return useQuery({
    queryKey: ['checkout', checkoutId],
    queryFn: () => getCheckoutFn({ data: { checkoutId } }),
    enabled: !!checkoutId,
  })
}
```

**Note:** The existing design doc (`2025-12-31-code-quality-improvements-design.md`) already covers consolidating `useCheckout.ts` → `useCheckoutQueries.ts`.

---

### 3. Missing Input Validation on Server Functions

**Severity:** High

**Files affected:**
- `src/server/orders.ts`
- `src/server/customers.ts`
- `src/server/checkout.ts`
- `src/server/products.ts`
- `src/server/media.ts`
- `src/server/auth.ts`

**Problem:**
Zero server functions use `.validator()` for input validation:
- No type safety - `data` parameter is untyped or manually typed
- No runtime validation - Malformed input causes cryptic errors
- Security risk - No protection against malicious payloads
- Inconsistent errors - Each function handles bad input differently

**Solution:**
```typescript
import { z } from 'zod'

const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
})

export const updateOrderFn = createServerFn({ method: 'POST' })
  .validator(updateOrderSchema.parse)  // Runtime validation + type inference
  .handler(async ({ data }) => {
    // data is fully typed: { orderId: string; status: 'pending' | ... }
    const { orderId, status } = data
  })
```

---

### 4. Manual Auth Checks Instead of beforeLoad

**Severity:** Medium

**Files affected:**
- `src/routes/$lang/account/orders.tsx:51-55`
- `src/routes/$lang/account/index.tsx`
- `src/routes/$lang/account/addresses.tsx`
- `src/routes/$lang/checkout/index.tsx:14-29`

**Correctly done:**
- `src/routes/admin/_authed.tsx:10-22` - uses `beforeLoad` properly

**Problem:**
Auth checks scattered in components via `useEffect`:
- Flash of content - Protected page renders, then redirects
- Hydration issues - Server doesn't know auth state
- Duplicated logic - Same auth check copy-pasted across routes
- Race conditions - Component might render before auth check completes

**Solution:**
Create a layout route for account pages (`$lang/account.tsx`):
```typescript
export const Route = createFileRoute('/$lang/account')({
  beforeLoad: async ({ params }) => {
    const session = await getCustomerMeFn()
    if (!session.customer) {
      throw redirect({ to: '/$lang/login', params })
    }
    return { customer: session.customer }
  },
})

// Child routes automatically inherit auth
function AccountPage() {
  const { customer } = Route.useRouteContext()
  return <ActualContent />
}
```

---

### 5. Redirect Logic in useEffect

**Severity:** Medium

**File:** `src/routes/$lang/checkout/index.tsx:14-29`

**Problem:**
Uses `useEffect` for conditional navigation instead of a loader:
- User sees a loading spinner before redirect
- Logic runs client-side after hydration
- No SSR benefit - server could handle this instantly

**Solution:**
```typescript
export const Route = createFileRoute('/$lang/checkout/')({
  beforeLoad: async ({ params }) => {
    // If checkoutId is stored in cookie (server-accessible):
    const checkoutId = getCheckoutIdFromCookie()

    if (checkoutId) {
      throw redirect({ to: '/$lang/checkout/information', params })
    }
    throw redirect({ to: '/$lang', params })
  },
})
```

**Caveat:** If `checkoutId` is only in localStorage (client-only), this redirect must stay client-side but should use `beforeLoad` with a minimal component.

---

### 6. Admin Pages Without Loaders

**Severity:** Medium

**Files affected:**
- `src/routes/admin/_authed/orders/index.tsx`
- `src/routes/admin/_authed/products/index.tsx`
- `src/routes/admin/_authed/collections/index.tsx`

**Problem:**
Admin routes fetch all data client-side with no SSR or prefetching:
- Slow initial load - Admin sees skeleton/spinner on every page
- No prefetch on hover - TanStack Router can prefetch on link hover
- Search params not type-safe - Manual parsing instead of `loaderDeps`

**Solution:**
```typescript
export const Route = createFileRoute('/admin/_authed/orders/')({
  validateSearch: (search) => orderSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    return { orders: await getOrdersFn({ data: search }) }
  },
  component: OrdersPage,
})

function OrdersPage() {
  const { orders } = Route.useLoaderData()
  // No loading state needed - data is ready
}
```

---

## Implementation Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Add `$lang/account.tsx` layout route with `beforeLoad` auth | Low | Removes 4 manual auth checks |
| 2 | Add `.validator()` to server functions | Medium | Security + type safety |
| 3 | Convert account routes to use loaders | Medium | Major UX improvement |
| 4 | Consolidate checkout hooks (per existing design) | Low | Already planned |
| 5 | Convert admin routes to use loaders | Medium | Internal improvement |
| 6 | Move checkout redirect to beforeLoad | Low | Minor cleanup |

---

## Success Criteria

- [ ] All account routes use shared `beforeLoad` auth from layout
- [ ] All server functions have `.validator()` with Zod schemas
- [ ] Account routes use `loader` functions (no useEffect data fetching)
- [ ] No Zustand stores holding full server objects (only IDs/references)
- [ ] Admin routes use `loader` + `loaderDeps` for search params
- [ ] TypeScript compiles without errors
- [ ] All tests pass
