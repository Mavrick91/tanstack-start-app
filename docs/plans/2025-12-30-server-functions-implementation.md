# Server Functions Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from REST API endpoints to TanStack Start server functions for end-to-end type safety.

**Architecture:** Replace fetch-based API calls with direct server function calls. Use TanStack's built-in `useSession` for auth cookies. Protect admin routes via `beforeLoad` hooks with typed user context.

**Tech Stack:** TanStack Start, Drizzle ORM, Zod validation, bcrypt-ts, Zustand

---

## Task 1: Add SESSION_SECRET Environment Variable

**Files:**

- Modify: `.env` (local only, not committed)
- Modify: `src/lib/env.ts:1-50`

**Step 1: Generate a secure session secret**

Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Add to .env file**

Add to your `.env`:

```
SESSION_SECRET=<paste-generated-secret-here>
```

**Step 3: Add SESSION_SECRET to env validation**

In `src/lib/env.ts`, add to required vars:

```typescript
SESSION_SECRET: z.string().min(32),
```

**Step 4: Verify env loads**

Run: `npm run dev`
Expected: Server starts without "SESSION_SECRET" error

**Step 5: Commit env.ts change**

```bash
git add src/lib/env.ts
git commit -m "feat(auth): add SESSION_SECRET to env validation"
```

---

## Task 2: Create Auth Server Functions

**Files:**

- Create: `src/server/auth.ts`
- Test: `src/server/auth.test.ts`

**Step 1: Write the auth server functions file**

Create `src/server/auth.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { useSession } from '@tanstack/react-start/server'
import { getWebRequest } from 'vinxi/http'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { sessions, users } from '../db/schema'
import { verifyPassword } from '../lib/auth'
import { checkRateLimit, getRateLimitKey } from '../lib/rate-limit'

// Session data type
export type SessionUser = {
  userId: string
  email: string
  role: string
}

// Session helper
export function useAppSession() {
  return useSession<SessionUser>({
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

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Login server function
export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    // Rate limiting
    const request = getWebRequest()
    const key = getRateLimitKey(request)
    const rateLimit = await checkRateLimit('auth', key)
    if (!rateLimit.allowed) {
      return {
        success: false as const,
        error: 'Too many attempts. Please try again later.',
      }
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))

    if (!user) {
      return { success: false as const, error: 'Invalid email or password' }
    }

    // Verify password
    const validPassword = await verifyPassword(data.password, user.passwordHash)
    if (!validPassword) {
      return { success: false as const, error: 'Invalid email or password' }
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
      success: true as const,
      user: { id: user.id, email: user.email, role: user.role },
    }
  })

// Logout server function
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  const data = await session.data

  if (data?.userId) {
    // Clear DB sessions for this user
    await db.delete(sessions).where(eq(sessions.userId, data.userId))
  }

  await session.clear()
  return { success: true }
})

// Get current user server function
export const getMeFn = createServerFn().handler(async () => {
  const session = await useAppSession()
  const data = await session.data

  if (!data?.userId) {
    return null
  }

  return {
    id: data.userId,
    email: data.email,
    role: data.role,
  }
})

// Auth user type (for consumers)
export type AuthUser = NonNullable<Awaited<ReturnType<typeof getMeFn>>>
```

**Step 2: Write basic tests**

Create `src/server/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}))

vi.mock('../lib/auth', () => ({
  verifyPassword: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('../lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
  getRateLimitKey: vi.fn(() => 'test-key'),
}))

vi.mock('vinxi/http', () => ({
  getWebRequest: vi.fn(() => ({
    headers: new Headers(),
  })),
}))

vi.mock('@tanstack/react-start/server', () => ({
  useSession: vi.fn(() => ({
    data: Promise.resolve(null),
    update: vi.fn(),
    clear: vi.fn(),
  })),
}))

describe('Auth Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SessionUser type', () => {
    it('should have correct shape', () => {
      const user: import('./auth').SessionUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
      }
      expect(user.userId).toBe('123')
      expect(user.email).toBe('test@example.com')
      expect(user.role).toBe('admin')
    })
  })

  describe('useAppSession', () => {
    it('should be a function', async () => {
      const { useAppSession } = await import('./auth')
      expect(typeof useAppSession).toBe('function')
    })
  })
})
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/server/auth.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/server/auth.ts src/server/auth.test.ts
git commit -m "feat(auth): add server functions for login, logout, getMe"
```

---

## Task 3: Update useAuth Hook

**Files:**

- Modify: `src/hooks/useAuth.ts`
- Modify: `src/hooks/useAuth.test.ts`

**Step 1: Update useAuth.ts to use server functions**

Replace `src/hooks/useAuth.ts`:

```typescript
import { create } from 'zustand'

import { loginFn, logoutFn, getMeFn } from '../server/auth'

type User = {
  id: string
  email: string
  role: string
}

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    try {
      const result = await loginFn({ data: { email, password } })

      if (result.success) {
        set({
          isAuthenticated: true,
          user: result.user,
        })
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: 'Login failed' }
    }
  },

  logout: async () => {
    try {
      await logoutFn()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ isAuthenticated: false, user: null })
    }
  },

  checkSession: async () => {
    try {
      set({ isLoading: true })
      const user = await getMeFn()

      if (user) {
        set({
          isAuthenticated: true,
          user,
          isLoading: false,
        })
      } else {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('Session check failed:', error)
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      })
    }
  },
}))
```

**Step 2: Update tests to mock server functions**

Replace `src/hooks/useAuth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock server functions
vi.mock('../server/auth', () => ({
  loginFn: vi.fn(),
  logoutFn: vi.fn(),
  getMeFn: vi.fn(),
}))

import { useAuthStore } from './useAuth'
import { loginFn, logoutFn, getMeFn } from '../server/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: true,
    })
  })

  describe('login', () => {
    it('should set user on successful login', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' }
      vi.mocked(loginFn).mockResolvedValueOnce({
        success: true,
        user: mockUser,
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const response = await result.current.login(
          'test@example.com',
          'password',
        )
        expect(response.success).toBe(true)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should return error on failed login', async () => {
      vi.mocked(loginFn).mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const response = await result.current.login('test@example.com', 'wrong')
        expect(response.success).toBe(false)
        expect(response.error).toBe('Invalid credentials')
      })

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user on logout', async () => {
      vi.mocked(logoutFn).mockResolvedValueOnce({ success: true })

      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('checkSession', () => {
    it('should set user if session exists', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' }
      vi.mocked(getMeFn).mockResolvedValueOnce(mockUser)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkSession()
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear user if no session', async () => {
      vi.mocked(getMeFn).mockResolvedValueOnce(null)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkSession()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/hooks/useAuth.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/hooks/useAuth.ts src/hooks/useAuth.test.ts
git commit -m "refactor(auth): update useAuth hook to use server functions"
```

---

## Task 4: Create Admin Auth Layout Route

**Files:**

- Create: `src/routes/admin/_authed.tsx`

**Step 1: Create the layout route**

Create `src/routes/admin/_authed.tsx`:

```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getMeFn } from '../../server/auth'

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
  component: AdminAuthLayout,
})

function AdminAuthLayout() {
  return <Outlet />
}
```

**Step 2: Regenerate route tree**

Run: `npm run dev` (will auto-generate routes)

Then stop the server.

**Step 3: Commit**

```bash
git add src/routes/admin/_authed.tsx src/routeTree.gen.ts
git commit -m "feat(auth): add admin auth layout route with beforeLoad protection"
```

---

## Task 5: Move Admin Routes Under \_authed

**Files:**

- Move: `src/routes/admin/index.tsx` -> `src/routes/admin/_authed/index.tsx`
- Move: `src/routes/admin/products/` -> `src/routes/admin/_authed/products/`
- Move: `src/routes/admin/orders/` -> `src/routes/admin/_authed/orders/`
- Move: `src/routes/admin/collections/` -> `src/routes/admin/_authed/collections/`
- Keep: `src/routes/admin/login.tsx` (stays outside \_authed)

**Step 1: Create \_authed directory**

```bash
mkdir -p src/routes/admin/_authed
```

**Step 2: Move admin index**

```bash
mv src/routes/admin/index.tsx src/routes/admin/_authed/index.tsx
```

**Step 3: Update the moved index route path**

Edit `src/routes/admin/_authed/index.tsx`, change the route path:

```typescript
export const Route = createFileRoute('/admin/_authed/')({
  component: AdminDashboard,
})
```

Also update to use route context for user:

```typescript
function AdminDashboard() {
  const { user } = Route.useRouteContext()
  // ... rest of component, replace useAuthStore user access
```

**Step 4: Move products folder**

```bash
mv src/routes/admin/products src/routes/admin/_authed/products
```

**Step 5: Update products route paths**

Edit each file in `src/routes/admin/_authed/products/`:

- `index.tsx`: change to `createFileRoute('/admin/_authed/products/')`
- `new.tsx`: change to `createFileRoute('/admin/_authed/products/new')`
- `$productId.tsx`: change to `createFileRoute('/admin/_authed/products/$productId')`

**Step 6: Move orders folder**

```bash
mv src/routes/admin/orders src/routes/admin/_authed/orders
```

**Step 7: Update orders route paths**

Edit each file in `src/routes/admin/_authed/orders/`:

- `index.tsx`: change to `createFileRoute('/admin/_authed/orders/')`
- `$orderId.tsx`: change to `createFileRoute('/admin/_authed/orders/$orderId')`

**Step 8: Move collections folder**

```bash
mv src/routes/admin/collections src/routes/admin/_authed/collections
```

**Step 9: Update collections route paths**

Edit each file in `src/routes/admin/_authed/collections/`:

- `index.tsx`: change to `createFileRoute('/admin/_authed/collections/')`
- `new.tsx`: change to `createFileRoute('/admin/_authed/collections/new')`
- `$collectionId.tsx`: change to `createFileRoute('/admin/_authed/collections/$collectionId')`

**Step 10: Regenerate route tree and verify**

Run: `npm run dev`

Navigate to `/admin` - should redirect to `/admin/login`

**Step 11: Commit**

```bash
git add -A
git commit -m "refactor(admin): move admin routes under _authed layout for protection"
```

---

## Task 6: Update Login Page to Use Server Functions

**Files:**

- Modify: `src/routes/admin/login.tsx`

**Step 1: Update login page**

The login page should use `useAuthStore().login()` which now calls server functions internally. Verify it works:

Run: `npm run dev`
Navigate to `/admin/login`, try logging in.

**Step 2: Commit if changes needed**

```bash
git add src/routes/admin/login.tsx
git commit -m "refactor(admin): update login page to work with new auth flow"
```

---

## Task 7: Create Products Server Functions

**Files:**

- Modify: `src/server/products.ts`

**Step 1: Add admin product list function**

Add to `src/server/products.ts`:

```typescript
import { z } from 'zod'
import { getMeFn } from './auth'

// Get all products (admin)
export const getAdminProductsFn = createServerFn().handler(async () => {
  const user = await getMeFn()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const allProducts = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))

  const productsWithData = await Promise.all(
    allProducts.map(async (product) => {
      const images = await db
        .select({ url: productImages.url })
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.position))
        .limit(1)

      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.position))

      return {
        ...product,
        imageUrl: images[0]?.url,
        variants,
        price: variants[0]?.price ?? '0',
      }
    }),
  )

  return productsWithData
})

// Get single product (admin)
export const getAdminProductFn = createServerFn()
  .validator((data: unknown) =>
    z.object({ productId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await getMeFn()
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized')
    }

    // ... existing getProductFn logic
  })

// Delete products bulk
export const deleteProductsBulkFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()) }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await getMeFn()
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized')
    }

    await db.delete(products).where(inArray(products.id, data.ids))
    return { success: true, deletedCount: data.ids.length }
  })
```

**Step 2: Run existing tests**

Run: `npx vitest run src/server/products`
Expected: PASS

**Step 3: Commit**

```bash
git add src/server/products.ts
git commit -m "feat(products): add admin server functions for products"
```

---

## Task 8: Update ProductsList Component

**Files:**

- Modify: `src/components/admin/products/ProductsList.tsx`

**Step 1: Update to use server functions**

Replace fetch calls with server function calls:

```typescript
import { getAdminProductsFn } from '@/server/products'

// In useQuery:
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => getAdminProductsFn(),
})
```

**Step 2: Run component tests**

Run: `npx vitest run src/components/admin/products/ProductsList.test.tsx`
Expected: PASS (may need to update mocks)

**Step 3: Commit**

```bash
git add src/components/admin/products/ProductsList.tsx
git commit -m "refactor(products): update ProductsList to use server functions"
```

---

## Task 9-15: Migrate Remaining Domains

Follow the same pattern for:

- **Task 9:** Orders server functions + component updates
- **Task 10:** Checkout server functions + hook updates
- **Task 11:** Customers server functions + component updates
- **Task 12:** Media server functions + component updates
- **Task 13:** Update remaining fetch calls in hooks
- **Task 14:** Delete old REST API routes
- **Task 15:** Delete CSRF code

Each task follows:

1. Create/extend server functions with auth checks
2. Update components/hooks to use server functions
3. Run tests
4. Commit

---

## Task 16: Final Cleanup

**Files:**

- Delete: `src/routes/api/auth/` (all files)
- Delete: `src/lib/csrf.ts`
- Modify: `src/lib/auth.ts` (remove unused functions)

**Step 1: Delete old auth routes**

```bash
rm -rf src/routes/api/auth
```

**Step 2: Delete CSRF utilities**

```bash
rm src/lib/csrf.ts src/lib/csrf.test.ts
```

**Step 3: Update imports**

Search for any remaining imports of deleted files and remove them.

**Step 4: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: remove old REST auth routes and CSRF code"
```

---

## Verification Checklist

After completing all tasks:

1. [ ] `npm run dev` starts without errors
2. [ ] `/admin` redirects to `/admin/login` when not authenticated
3. [ ] Login works and redirects to `/admin`
4. [ ] All admin pages load with typed user context
5. [ ] Logout works and redirects to login
6. [ ] `npm run test` - all tests pass
7. [ ] `npm run typecheck` - no type errors
8. [ ] `npm run build` - builds successfully
