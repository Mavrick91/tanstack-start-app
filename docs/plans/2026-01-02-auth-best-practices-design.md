# Auth Feature Best Practices Refactor

## Overview

Refactor the customer authentication feature to follow TanStack Start and React best practices. The current implementation mixes patterns (API routes vs server functions, manual state vs React Query), creating inconsistency and redundant code.

## Current State

### Files Involved

- `src/routes/api/auth/*.ts` - REST API routes (to be removed)
- `src/server/auth.ts` - Server functions for admin auth
- `src/server/auth-customer.ts` - Server functions for customer auth
- `src/features/auth/` - Components, hooks, and utilities
- `src/hooks/useAuth.ts` - Zustand auth store

### Problems Identified

1. **Dual API patterns**: Mix of file-based API routes and TanStack server functions
2. **Manual fetch calls**: Components use `fetch()` instead of calling server functions directly
3. **Manual loading/error state**: Forms use `useState` instead of React Query mutations
4. **Duplicate auth state**: Three sources of truth (useAuthStore, useAuthModal, React Query)
5. **Hardcoded language**: Redirects and emails hardcode `'en'` instead of using current locale
6. **Duplicate session helpers**: `getAppSession` defined in multiple files

## Design

### 1. Remove Redundant API Routes

Delete these files entirely:

- `src/routes/api/auth/login.ts`
- `src/routes/api/auth/register.ts`
- `src/routes/api/auth/verify-email.ts`
- `src/routes/api/auth/forgot-password.ts`
- `src/routes/api/auth/reset-password.ts`

Keep OAuth routes (they require URL redirects):

- `src/routes/api/auth/google/index.ts`
- `src/routes/api/auth/google/callback.ts`

### 2. Update Form Components to Use Server Functions

#### RegisterForm.tsx

```typescript
// Before
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: values.email }),
})

// After
import { registerCustomerFn } from '@/server/auth-customer'
const result = await registerCustomerFn({ data: { email: values.email } })
```

#### PasswordSetupForm.tsx

```typescript
// Before
const response = await fetch(endpoint, { ... })

// After
import { verifyEmailFn, resetPasswordFn } from '@/server/auth-customer'
const result = type === 'verify'
  ? await verifyEmailFn({ data: { token, password } })
  : await resetPasswordFn({ data: { token, password } })
```

#### ForgotPasswordForm.tsx

```typescript
// Before
await fetch('/api/auth/forgot-password', { ... })

// After
import { forgotPasswordFn } from '@/server/auth-customer'
await forgotPasswordFn({ data: { email: values.email } })
```

### 3. Use React Query Mutations

Replace manual `useState` for loading/error with `useMutation`:

```typescript
// Before
const [error, setError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (values) => {
  setError(null)
  setIsLoading(true)
  try {
    const result = await someServerFn({ data: values })
    // handle success
  } catch (e) {
    setError(e.message)
  } finally {
    setIsLoading(false)
  }
}

// After
const mutation = useMutation({
  mutationFn: (data) => someServerFn({ data }),
  onSuccess: (result) => {
    // handle success
  },
})

const handleSubmit = (values) => {
  mutation.mutate(values)
}

// Use mutation.isPending, mutation.error in render
```

### 4. Consolidate Auth State to React Query

Remove `useAuthStore` from `src/hooks/useAuth.ts`. Replace with React Query:

```typescript
// New: src/hooks/useSession.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMeFn, loginFn, logoutFn } from '@/server/auth'

export const useSession = () => {
  return useQuery({
    queryKey: ['session'],
    queryFn: getMeFn,
    staleTime: 5 * 60 * 1000,
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutFn,
    onSuccess: () => {
      queryClient.setQueryData(['session'], null)
    },
  })
}
```

Unify session query key - use `['session']` everywhere instead of mixing `['customer', 'session']`.

### 5. Fix Hardcoded Language

#### In components (use route params):

```typescript
// PasswordSetupForm.tsx
const { lang } = useParams({ from: '/$lang/auth/verify' })
navigate({ to: '/$lang/account', params: { lang } })
```

#### In server functions (accept lang parameter):

```typescript
// auth-customer.ts
const registerSchema = z.object({
  email: z.string().email(),
  lang: z.enum(['en', 'fr', 'id']).default('en'),
})

// Then use data.lang in email URLs
const verifyUrl = `${getBaseUrl()}/${data.lang}/auth/verify?token=${token}`
```

### 6. Extract Shared Session Helper

Create `src/server/session.ts`:

```typescript
import type { SessionUser } from './auth'

export const getAppSession = async () => {
  const { useSession } = await import('@tanstack/react-start/server')
  return useSession<SessionUser>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    },
  })
}
```

Update `auth.ts` and `google/callback.ts` to import from this shared location.

### 7. OAuth Redirect Validation

In `google/index.ts`, validate returnUrl is a relative path:

```typescript
GET: async ({ request }) => {
  const url = new URL(request.url)
  let returnUrl = url.searchParams.get('returnUrl') || '/en/account'

  // Prevent open redirect - must be relative path
  if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
    returnUrl = '/en/account'
  }

  const googleUrl = getGoogleAuthUrl(returnUrl)
  return Response.redirect(googleUrl)
}
```

## Files to Modify

| File                                                  | Action                                    |
| ----------------------------------------------------- | ----------------------------------------- |
| `src/routes/api/auth/login.ts`                        | Delete                                    |
| `src/routes/api/auth/register.ts`                     | Delete                                    |
| `src/routes/api/auth/verify-email.ts`                 | Delete                                    |
| `src/routes/api/auth/forgot-password.ts`              | Delete                                    |
| `src/routes/api/auth/reset-password.ts`               | Delete                                    |
| `src/routes/api/auth/google/index.ts`                 | Add redirect validation                   |
| `src/routes/api/auth/google/callback.ts`              | Import shared session helper              |
| `src/server/auth.ts`                                  | Import shared session helper              |
| `src/server/auth-customer.ts`                         | Add lang param to schemas, fix email URLs |
| `src/server/session.ts`                               | Create - shared session helper            |
| `src/hooks/useAuth.ts`                                | Delete (replace with useSession.ts)       |
| `src/hooks/useSession.ts`                             | Create - React Query session hooks        |
| `src/features/auth/components/LoginForm.tsx`          | Use useMutation, useLogin                 |
| `src/features/auth/components/RegisterForm.tsx`       | Use server fn + useMutation               |
| `src/features/auth/components/PasswordSetupForm.tsx`  | Use server fn + useMutation, fix lang     |
| `src/features/auth/components/ForgotPasswordForm.tsx` | Use server fn + useMutation               |
| `src/routes/$lang/auth/index.tsx`                     | Use unified session query key             |
| `src/routes/$lang/auth/verify.tsx`                    | Pass lang to form                         |
| `src/routes/$lang/auth/reset-password.tsx`            | Pass lang to form                         |

## Testing

After changes:

1. Register flow: enter email -> receive email -> click link -> set password -> logged in
2. Login flow: enter credentials -> logged in -> session persists on refresh
3. Forgot password: enter email -> receive email -> click link -> set new password
4. Google OAuth: click button -> Google consent -> redirected back logged in
5. Logout: click logout -> session cleared

## Notes

- Keep `useAuthModal` as-is (UI state, not auth state)
- OAuth routes must remain as file routes (require URL redirects)
- All server functions already have rate limiting - no changes needed
