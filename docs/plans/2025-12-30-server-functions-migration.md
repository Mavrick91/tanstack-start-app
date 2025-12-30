# Server Functions Migration Design

## Overview

Migrate from REST API endpoints with manual fetch calls to TanStack Start server functions for full end-to-end type safety.

## Goals

1. **Type safety**: Eliminate untyped `fetch()` calls - all data flows are fully typed
2. **Simplify auth**: Use TanStack's built-in `useSession` instead of manual cookie handling
3. **Route protection**: Server-side auth via `beforeLoad` hooks instead of client-side checks
4. **Remove CSRF complexity**: `SameSite` cookies handle this automatically

## Session Strategy

**Hybrid approach:**

- Use TanStack `useSession` for session data (encrypted in cookie)
- Keep `sessions` table for audit trail and session revocation capability
- On login: create DB session record + set cookie session
- On logout: delete DB session + clear cookie session

## New File Structure

```
src/server/
  auth.ts        # login, logout, getMe, useAppSession
  products.ts    # (extend existing)
  orders.ts      # (extend existing)
  checkout.ts    # new
  customers.ts   # new
  media.ts       # new
```

## Auth Implementation

### Session Helper

```typescript
// src/server/auth.ts
import { useSession } from '@tanstack/react-start/server'

type SessionData = {
  userId: string
  email: string
  role: string
}

export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  })
}
```

### Server Functions

```typescript
export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().email(), password: z.string() }))
  .handler(async ({ data }) => {
    // Rate limiting
    const key = getRateLimitKey(getWebRequest())
    const rateLimit = await checkRateLimit('auth', key)
    if (!rateLimit.allowed) {
      return { success: false, error: 'Too many attempts' }
    }

    // Verify credentials
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Create DB session (for audit/revocation)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.insert(sessions).values({ userId: user.id, expiresAt })

    // Set cookie session
    const session = await useAppSession()
    await session.update({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  const data = await session.data

  if (data?.userId) {
    // Clear DB sessions for this user (optional: just the current one)
    await db.delete(sessions).where(eq(sessions.userId, data.userId))
  }

  await session.clear()
  return { success: true }
})

export const getMeFn = createServerFn().handler(async () => {
  const session = await useAppSession()
  const data = await session.data
  if (!data?.userId) return null
  return { id: data.userId, email: data.email, role: data.role }
})
```

## Route Protection

### Admin Layout Route

```typescript
// src/routes/admin/_authed.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getMeFn } from '@/server/auth'

export const Route = createFileRoute('/admin/_authed')({
  beforeLoad: async () => {
    const user = await getMeFn()
    if (!user) {
      throw redirect({ to: '/admin/login' })
    }
    if (user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
    return { user }
  },
})
```

### Child Routes

All admin routes (except login) become children of `_authed`:

- `src/routes/admin/_authed/index.tsx`
- `src/routes/admin/_authed/products/index.tsx`
- `src/routes/admin/_authed/orders/index.tsx`
- etc.

Child routes access user via `Route.useRouteContext()`:

```typescript
function AdminDashboard() {
  const { user } = Route.useRouteContext()
  // user is typed!
}
```

## Server Functions by Domain

### Products (`src/server/products.ts`)

```typescript
export const getProductsFn = createServerFn().handler(async () => {
  const user = await getMeFn()
  if (!user) throw new Error('Unauthorized')
  // ... existing logic from /api/products GET
})

export const getProductFn = createServerFn()
  .validator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(/* product schema */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const deleteProductsFn = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(z.string().uuid()) }))
  .handler(async ({ data }) => {
    /* ... */
  })
```

### Orders (`src/server/orders.ts`)

```typescript
export const getOrdersFn = createServerFn()
  .validator(
    z.object({ page: z.number(), status: z.string().optional() /* ... */ }),
  )
  .handler(async ({ data }) => {
    /* ... */
  })

export const getOrderFn = createServerFn()
  .validator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })

export const updateOrderFn = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const getOrderStatsFn = createServerFn().handler(async () => {
  /* ... */
})

export const getOrderHistoryFn = createServerFn()
  .validator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })
```

### Checkout (`src/server/checkout.ts`)

```typescript
export const createCheckoutFn = createServerFn({ method: 'POST' })
  .validator(/* cart items schema */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const getCheckoutFn = createServerFn()
  .validator(z.object({ checkoutId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })

export const updateCheckoutCustomerFn = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const updateCheckoutShippingAddressFn = createServerFn({
  method: 'POST',
})
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const getShippingRatesFn = createServerFn()
  .validator(z.object({ checkoutId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })

export const selectShippingMethodFn = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const createPaymentIntentFn = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const completeCheckoutFn = createServerFn({ method: 'POST' })
  .validator(/* ... */)
  .handler(async ({ data }) => {
    /* ... */
  })
```

### Customers (`src/server/customers.ts`)

```typescript
export const getCustomerMeFn = createServerFn().handler(async () => {
  /* ... */
})

export const getCustomerAddressesFn = createServerFn().handler(async () => {
  /* ... */
})

export const createAddressFn = createServerFn({ method: 'POST' })
  .validator(/* address schema */)
  .handler(async ({ data }) => {
    /* ... */
  })

export const deleteAddressFn = createServerFn({ method: 'POST' })
  .validator(z.object({ addressId: z.string().uuid() }))
  .handler(async ({ data }) => {
    /* ... */
  })

export const getCustomerOrdersFn = createServerFn().handler(async () => {
  /* ... */
})
```

### Media (`src/server/media.ts`)

```typescript
export const getMediaFn = createServerFn().handler(async () => {
  /* ... */
})

export const uploadMediaFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    // Handle multipart form data
  },
)

export const deleteMediaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(z.string().uuid()) }))
  .handler(async ({ data }) => {
    /* ... */
  })
```

## Hook Updates

### useAuth.ts

```typescript
import { create } from 'zustand'
import { loginFn, logoutFn, getMeFn } from '@/server/auth'

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const result = await loginFn({ data: { email, password } })
    if (result.success && result.user) {
      set({ isAuthenticated: true, user: result.user })
      return true
    }
    return false
  },

  logout: async () => {
    await logoutFn()
    set({ isAuthenticated: false, user: null })
  },

  checkSession: async () => {
    set({ isLoading: true })
    const user = await getMeFn()
    set({
      isAuthenticated: !!user,
      user,
      isLoading: false,
    })
  },
}))
```

## Files to Delete After Migration

- `src/routes/api/auth/login.ts`
- `src/routes/api/auth/logout.ts`
- `src/routes/api/auth/me.ts`
- `src/lib/csrf.ts`
- `src/routes/api/products/index.ts` (if no external consumers)
- `src/routes/api/products/$productId.ts`
- `src/routes/api/products/bulk.ts`
- `src/routes/api/products/stats.ts`
- `src/routes/api/orders/*`
- `src/routes/api/checkout/*`
- `src/routes/api/customers/*`
- `src/routes/api/media/*`
- `src/routes/api/upload.ts`

## Environment Variables

Add to `.env`:

```
SESSION_SECRET=your-32-character-or-longer-secret-here
```

## Migration Order

1. Add SESSION_SECRET to environment
2. Create `src/server/auth.ts` with session helper and auth functions
3. Update `useAuth.ts` to use server functions
4. Create `src/routes/admin/_authed.tsx` layout route
5. Move admin routes under `_authed` folder
6. Migrate domain server functions one at a time (products, orders, etc.)
7. Update components to use server functions instead of fetch
8. Delete old REST routes and CSRF code
9. Run tests and verify everything works
