# TanStack Anti-Patterns Audit

**Date:** 2026-01-01
**Status:** Validated
**Scope:** Comprehensive audit of TanStack Start/Router patterns, React best practices, performance, and security

---

## Executive Summary

This audit identified 11 anti-patterns across the codebase, ranging from high-severity SSR/hydration issues to low-severity consistency improvements. The most critical findings involve:

1. Client-only state being used in server-side `beforeLoad` hooks
2. `useEffect` for data fetching instead of route loaders
3. Auth patterns causing performance issues on every navigation

---

## Findings by Severity

### High Severity

#### 1. Client State in beforeLoad (SSR Mismatch)

**Location:** `src/routes/admin/login.tsx:103-108`

**Problem:**

```typescript
beforeLoad: () => {
  const { isAuthenticated } = useAuthStore.getState() // Client-only!
  if (isAuthenticated) {
    throw redirect({ to: '/admin' })
  }
}
```

Zustand stores don't exist on the server. This causes hydration mismatches and bypasses auth checks during SSR.

**Fix:**

```typescript
beforeLoad: async () => {
  const user = await getMeFn()
  if (user) {
    throw redirect({ to: '/admin' })
  }
}
```

**Reference:** [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)

---

#### 2. useEffect for Data Fetching Instead of Loaders

**Location:** `src/routes/admin/_authed/orders/$orderId.tsx:32-47`

**Problem:**

```typescript
const [order, setOrder] = useState<Order | null>(null)
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const loadOrder = async () => {
    setIsLoading(true)
    const result = await getAdminOrderFn({ data: { orderId } })
    setOrder(result.order)
    setIsLoading(false)
  }
  loadOrder()
}, [orderId])
```

Classic fetch-on-render anti-pattern. No SSR, no preloading, manual state management.

**Fix:**

```typescript
export const Route = createFileRoute('/admin/_authed/orders/$orderId')({
  loader: async ({ params }) => {
    const [orderResult, historyResult] = await Promise.all([
      getAdminOrderFn({ data: { orderId: params.orderId } }),
      getOrderHistoryFn({ data: { orderId: params.orderId } }),
    ])
    return { order: orderResult.order, history: historyResult.history }
  },
  component: AdminOrderDetailPage,
})

// Component
const { order, history } = Route.useLoaderData()
```

**Reference:** [TanStack Router Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading)

---

### Medium Severity

#### 3. React Query Without Loader Integration

**Location:** `src/hooks/useDataTable.ts`, `src/routes/admin/_authed/products/index.tsx`

**Problem:**

```typescript
// Route has loaderDeps but no loader
export const Route = createFileRoute('/admin/_authed/products/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }), // Unused!
  component: AdminProductsPage,
})
```

No SSR for initial table data, no link preloading.

**Fix:**

```typescript
export const Route = createFileRoute('/admin/_authed/products/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ['products', search],
      queryFn: () => fetchProductsForTable(buildTableState(search)),
    })
  },
  component: AdminProductsPage,
})
```

**Reference:** [TanStack Router + Query Integration](https://frontendmasters.com/blog/tanstack-router-data-loading-2/)

---

#### 4. useEffect Chains in Checkout Flow

**Location:** `src/routes/$lang/checkout/information.tsx:86-101`

**Problem:**

```typescript
useEffect(() => {
  if (checkout?.email && emailFormRef.current) {
    emailFormRef.current.setFieldValue('email', checkout.email)
  }
}, [checkout?.email])

useEffect(() => {
  const init = async () => {
    if (!checkoutId && cartItems.length > 0) {
      await createCheckoutMutation.mutateAsync(cartItems)
    }
  }
  init()
}, [checkoutId, cartItems, ...])
```

Race conditions, component flicker, scattered logic.

**Fix:** Move initialization to `beforeLoad`/`loader`, use route context for checkout data.

---

#### 5. Dual Storage for Checkout ID (Zustand + Cookies)

**Location:** `src/hooks/useCheckout.ts`, `src/lib/checkout-auth.ts`

**Problem:**

```typescript
onSuccess: (checkout) => {
  setCheckoutId(checkout.id) // Zustand/localStorage
  setCheckoutIdCookieClient(checkout.id) // Cookie
}
```

Two sources of truth can desync.

**Fix:** Use cookies only (needed for SSR). Remove `useCheckoutIdStore`. Get checkout ID from route context.

---

#### 6. Auth State in Zustand Instead of Route Context

**Location:** `src/hooks/useAuth.ts`, `src/routes/admin/_authed.tsx`

**Problem:**

```typescript
// _authed.tsx fetches user but throws it away
beforeLoad: async () => {
  const user = await getMeFn()
  if (!user) throw redirect({ to: '/admin/login' })
  // User data not passed to context!
}

// Components re-fetch via Zustand
const user = useAuthStore((s) => s.user)
```

Duplicate server calls, wasted work.

**Fix:**

```typescript
beforeLoad: async () => {
  const user = await getMeFn()
  if (!user) throw redirect({ to: '/admin/login' })
  return { user } // Pass to context
}

// Component
const { user } = Route.useRouteContext()
```

**Reference:** [TanStack Router Auth Patterns](https://deepwiki.com/tanstack/router/9.4-authentication-and-protected-routes)

---

#### 7. Inefficient Data Fetching (Over-fetching)

**Location:** `src/routes/$lang/account/orders/$orderId.tsx:260-263`

**Problem:**

```typescript
loader: async ({ params }) => {
  const data = await getCustomerOrdersFn({ data: { page: 1, limit: 100 } })
  const order = data.orders.find((o) => o.id === params.orderId) // Client-side filter!
  return { order }
}
```

Fetches 100 orders to display 1.

**Fix:** Create `getCustomerOrderByIdFn` server function that fetches single order by ID with proper authorization.

---

#### 8. Auth Check Blocking Every Navigation

**Location:** `src/routes/admin/_authed.tsx`, `src/routes/$lang/account.tsx`

**Problem:**

```typescript
beforeLoad: async () => {
  const user = await getMeFn() // 200-300ms on EVERY navigation
  if (!user) throw redirect({ to: '/admin/login' })
}
```

Known TanStack Router performance issue.

**Fix:** Cache auth in root context, only re-validate when needed:

```typescript
// Root route - fetch once
beforeLoad: async ({ context }) => {
  if (context.authChecked) return
  const user = await getMeFn()
  return { user, authChecked: true }
}

// _authed.tsx - use cached value
beforeLoad: ({ context }) => {
  if (!context.user) throw redirect({ to: '/admin/login' })
  return { user: context.user }
}
```

**Reference:** [GitHub Issue #3997](https://github.com/TanStack/router/issues/3997)

---

### Low Severity

#### 9. Inconsistent API Patterns (Fetch vs Server Functions)

**Location:** `src/hooks/useCheckout.ts:307-320`

**Problem:** Stripe payment intent uses direct `fetch()` while everything else uses server functions.

**Fix:** Convert to `createStripePaymentIntentFn` server function for consistency, type safety, and automatic error handling.

---

#### 10. Duplicate API Routes and Server Functions

**Location:** `src/routes/api/` and `src/server/`

**Problem:** Some functionality exists as both API route and server function (e.g., orders).

**Fix:**

- Keep API routes only for: webhooks, external consumers, third-party integrations
- Use server functions for: internal app calls, loaders, UI mutations
- Remove duplicate API routes called only internally

---

#### 11. React Anti-Patterns

**11a. Missing Error Boundaries**
Most routes lack `errorComponent`. Add fallback UI for loader/render errors.

**11b. Console.error in Production**
Multiple `console.error` calls leak to production. Use conditional logging or logging service.

**11c. Inline Functions in Lists**
Consider `useCallback` for handlers passed to table row components to prevent re-renders.

---

## Implementation Priority

| Priority | Finding                       | Effort | Impact          |
| -------- | ----------------------------- | ------ | --------------- |
| 1        | #1 Client state in beforeLoad | Low    | High (SSR fix)  |
| 2        | #2 useEffect data fetching    | Medium | High (SSR + UX) |
| 3        | #6 Auth in Zustand vs context | Medium | High (perf)     |
| 4        | #8 Auth blocking navigation   | Medium | High (perf)     |
| 5        | #7 Over-fetching orders       | Low    | Medium          |
| 6        | #3 Query + Loader integration | Medium | Medium (SSR)    |
| 7        | #5 Dual checkout storage      | Low    | Medium          |
| 8        | #4 Checkout useEffect chains  | High   | Medium          |
| 9        | #9 Fetch vs server functions  | Low    | Low             |
| 10       | #10 Duplicate routes          | Low    | Low             |
| 11       | #11 React patterns            | Low    | Low             |

---

## Sources

- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Router Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading)
- [TanStack Start Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [TanStack Router Auth Patterns](https://deepwiki.com/tanstack/router/9.4-authentication-and-protected-routes)
- [GitHub: Auth Performance Issue #3997](https://github.com/TanStack/router/issues/3997)
- [Frontend Masters: Router + Query Integration](https://frontendmasters.com/blog/tanstack-router-data-loading-2/)
- [Tips from 8 months of TanStack Router](https://swizec.com/blog/tips-from-8-months-of-tan-stack-router-in-production/)
