---
name: debugging
description: Debug common issues with authentication, payments, database queries, React components, and API routes. Use when troubleshooting errors, investigating bugs, or diagnosing unexpected behavior.
---

# Debugging Guide

Solutions for common issues in this application.

## Quick Diagnosis

| Symptom               | Likely Cause            | Check                           |
| --------------------- | ----------------------- | ------------------------------- |
| 401 Unauthorized      | Session expired/missing | Cookie presence, session expiry |
| 403 Forbidden         | Wrong role              | User role in database           |
| 429 Too Many Requests | Rate limited            | Wait for retry-after            |
| 500 Server Error      | Unhandled exception     | Server logs                     |
| Empty response        | Query returned nothing  | Database data                   |
| Stale data            | Cache not invalidated   | React Query cache               |
| Form not submitting   | Validation error        | Console, field errors           |

## Authentication Issues

### "Unauthorized" (401)

**Check session cookie:**

```typescript
// In browser DevTools > Application > Cookies
// Look for 'session' cookie

// Or in API route:
const cookie = request.headers.get('cookie')
console.log('Cookie header:', cookie)
```

**Check session in database:**

```sql
SELECT * FROM sessions WHERE id = 'session-id-from-cookie';
-- Check expires_at is in the future
```

**Common fixes:**

1. Clear cookies and re-login
2. Check cookie domain matches
3. Verify `credentials: 'include'` in fetch calls

### "Forbidden" (403)

**Check user role:**

```sql
SELECT id, email, role FROM users WHERE id = 'user-id';
-- Should be 'admin' for admin routes
```

**Fix:**

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### Login Not Working

**Check password hash:**

```typescript
import { verify } from 'bcrypt-ts'

const isValid = await verify(inputPassword, user.passwordHash)
console.log('Password valid:', isValid)
```

**Common issues:**

- Password not meeting requirements (8+ chars, uppercase, lowercase, number)
- Rate limited (5 attempts per 15 minutes)
- Wrong email (check exact match, case-sensitive)

## Database Issues

### Query Returns Empty

**Check data exists:**

```sql
SELECT * FROM products WHERE id = 'product-id';
SELECT * FROM products WHERE handle = 'product-handle';
```

**Check query conditions:**

```typescript
// Add logging
console.log('Query params:', { search, status, page })

const results = await db.select().from(products).where(whereClause)

console.log('Results:', results.length)
```

### N+1 Query Performance

**Symptom:** Slow API responses, many database queries

**Diagnose:**

```typescript
// Add query logging in db/index.ts
const db = drizzle(pool, {
  logger: true, // Logs all queries
})
```

**Fix:** Use batch queries with Maps (see `database` skill)

### Migration Fails

**Check migration status:**

```bash
yarn db:studio  # Open Drizzle Studio
```

**Reset and retry:**

```bash
# Development only!
yarn db:push  # Push schema directly
```

**Check for conflicts:**

```sql
-- Check existing tables/columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'your_table';
```

## API Route Issues

### Request Body Empty

**Check Content-Type:**

```typescript
console.log('Content-Type:', request.headers.get('content-type'))

// Must be application/json for JSON body
const body = await request.json()
console.log('Body:', body)
```

**Fix frontend:**

```typescript
fetch('/api/resource', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
  credentials: 'include',
})
```

### CORS Errors

**Symptom:** "CORS policy" error in browser console

**Check:**

- API route exists at correct path
- Request method matches handler
- Credentials included if needed

### Rate Limiting

**Symptom:** 429 Too Many Requests

**Check Retry-After header:**

```typescript
const response = await fetch('/api/auth/login', { ... })
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  console.log('Wait seconds:', retryAfter)
}
```

**Tiers:**

- `auth`: 5 requests per 15 minutes
- `api`: 100 requests per minute
- `webhook`: 50 requests per minute

## Payment Issues

### Stripe Payment Fails

**Check PaymentIntent status:**

```typescript
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
console.log('Status:', paymentIntent.status)
console.log('Last error:', paymentIntent.last_payment_error)
```

**Common issues:**

- Test card declined (use 4242 4242 4242 4242)
- Amount too low (minimum varies by currency)
- Missing required fields

### Webhook Not Received

**Check webhook configuration:**

1. Stripe Dashboard > Developers > Webhooks
2. Verify endpoint URL is correct
3. Check webhook secret matches env var

**Test locally with Stripe CLI:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Check signature:**

```typescript
try {
  const event = stripe.webhooks.constructEvent(body, sig, secret)
} catch (err) {
  console.error('Webhook signature failed:', err.message)
}
```

### Checkout Expired

**Check expiration:**

```sql
SELECT id, expires_at, completed_at
FROM checkouts
WHERE id = 'checkout-id';
```

**Extend expiration (dev only):**

```sql
UPDATE checkouts
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE id = 'checkout-id';
```

## React/Frontend Issues

### Component Not Updating

**Check React Query cache:**

```typescript
// Force refetch
const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: ['products'] })
```

**Check Zustand state:**

```typescript
// In browser DevTools console
const state = useCartStore.getState()
console.log('Cart items:', state.items)
```

### Form Validation Not Working

**Check field configuration:**

```typescript
{
  name: 'email',
  type: 'email',
  label: 'Email',
  required: true,  // Must be true for validation
  validate: (value) => {
    console.log('Validating:', value)  // Debug
    if (!value) return 'Required'
  },
}
```

**Check form ref:**

```typescript
const formRef = useRef<FNFormRef | null>(null)

// Is ref connected?
console.log('Form ref:', formRef.current)

// Try manual submit
formRef.current?.submit()
```

### Hydration Mismatch

**Symptom:** "Text content does not match" warning

**Common causes:**

- Date/time formatting (server vs client timezone)
- Random values (use seeded random or useId)
- LocalStorage access during SSR

**Fix:**

```typescript
// Use useEffect for client-only values
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

if (!mounted) return <Skeleton />
return <ClientOnlyComponent />
```

### i18n Missing Key

**Symptom:** Shows key instead of translation

**Check:**

1. Key exists in all locale files
2. i18n initialized before render
3. Correct namespace

**Debug:**

```typescript
const { t, i18n } = useTranslation()
console.log('Current lang:', i18n.language)
console.log('Translation:', t('key', { returnDetails: true }))
```

## Logging & Monitoring

### Add Request Logging

```typescript
// In API route
import { logRequest, createRequestTimer } from '@/lib/logger'

GET: async ({ request }) => {
  const timer = createRequestTimer()

  try {
    // ... handler logic
    logRequest(request, response, timer)
    return response
  } catch (error) {
    logError('Handler failed', error, { url: request.url })
    throw error
  }
}
```

### Debug Database Queries

```typescript
// Temporarily enable query logging
import { drizzle } from 'drizzle-orm/node-postgres'

const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('Query:', query)
      console.log('Params:', params)
    },
  },
})
```

## Common Error Messages

| Error                                | Meaning              | Fix                        |
| ------------------------------------ | -------------------- | -------------------------- |
| `ECONNREFUSED`                       | Database not running | Start PostgreSQL           |
| `relation does not exist`            | Table missing        | Run migrations             |
| `duplicate key value`                | Unique constraint    | Check for existing record  |
| `invalid input syntax for type uuid` | Bad UUID format      | Validate UUID before query |
| `JWT expired`                        | Token expired        | Refresh token or re-auth   |
| `rate limit exceeded`                | Too many requests    | Wait and retry             |

## Environment Issues

### Missing Environment Variable

```typescript
// Check at startup
const required = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'CHECKOUT_SECRET']

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}
```

### Wrong Environment

```typescript
// Check which environment
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('Is production:', process.env.NODE_ENV === 'production')
```

## Useful Commands

```bash
# Check database connection
yarn db:studio

# Run single test with logging
yarn vitest run path/to/test.ts --reporter=verbose

# Type check
yarn typecheck

# Check for lint errors
yarn lint

# View build output
yarn build && ls -la .output/
```

## See Also

- `api-routes` skill - API debugging patterns
- `database` skill - Query debugging
- `checkout` skill - Payment debugging
- `testing` skill - Test debugging
- `security` skill - Auth debugging
