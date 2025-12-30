---
name: security
description: Security auditing and implementation for authentication, rate limiting, CSRF protection, input validation, and secure coding practices. Use when reviewing security, adding auth, or hardening endpoints.
---

# Security Auditor

Comprehensive security patterns for this e-commerce application.

## Security Checklist

### API Endpoint Security

- [ ] **Authentication**: `requireAuth()` or `requireAdmin()` applied
- [ ] **Rate Limiting**: `checkRateLimit()` for abuse prevention
- [ ] **Input Validation**: All user input validated
- [ ] **CSRF Protection**: State-changing operations protected
- [ ] **SQL Injection**: Using Drizzle parameterized queries
- [ ] **Error Messages**: No sensitive data in responses
- [ ] **Logging**: Errors logged, not exposed to client

## Authentication

### Session-Based Auth

```typescript
// src/lib/auth.ts
import { db } from '@/db'
import { sessions, users } from '@/db/schema'
import { hash, verify } from 'bcrypt-ts'

// Password hashing (cost factor 10)
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return verify(password, hashedPassword)
}

// Session validation
export async function validateSession(request: Request) {
  const cookie = request.headers.get('cookie')
  const sessionId = parseCookie(cookie, 'session')

  if (!sessionId) {
    return { success: false, error: 'No session' }
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session || session.expiresAt < new Date()) {
    return { success: false, error: 'Invalid or expired session' }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  return { success: true, user }
}
```

### Secure Cookie Settings

```typescript
const cookieOptions = {
  httpOnly: true, // Prevent XSS access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax' as const, // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
}

// Set cookie
response.headers.set(
  'Set-Cookie',
  `session=${sessionId}; ${Object.entries(cookieOptions)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')}`,
)
```

### Auth Middleware

```typescript
// src/lib/api.ts
export async function requireAuth(request: Request) {
  const session = await validateSession(request)

  if (!session.success) {
    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { success: true, user: session.user }
}

export async function requireAdmin(request: Request) {
  const auth = await requireAuth(request)

  if (!auth.success) return auth

  if (auth.user.role !== 'admin') {
    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return auth
}
```

## Rate Limiting

```typescript
// src/lib/rate-limit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Three tiers for different endpoints
const limiters = {
  auth: new RateLimiterMemory({
    points: 5, // 5 attempts
    duration: 15 * 60, // per 15 minutes
  }),
  api: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 60, // per minute
  }),
  webhook: new RateLimiterMemory({
    points: 50, // 50 requests
    duration: 60, // per minute
  }),
}

export async function checkRateLimit(
  request: Request,
  tier: 'auth' | 'api' | 'webhook',
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    await limiters[tier].consume(ip)
    return { allowed: true }
  } catch (error) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000)
    return { allowed: false, retryAfter }
  }
}
```

### Usage in Endpoints

```typescript
// Always rate limit BEFORE auth (prevent enumeration attacks)
const rateLimit = await checkRateLimit(request, 'auth')
if (!rateLimit.allowed) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: { 'Retry-After': String(rateLimit.retryAfter) },
  })
}
```

## CSRF Protection

```typescript
// src/lib/csrf.ts
import { randomBytes, timingSafeEqual, createHmac } from 'crypto'

// Generate token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

// Timing-safe validation (prevent timing attacks)
export function validateCsrfToken(token: string, expected: string): boolean {
  if (token.length !== expected.length) return false

  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  return timingSafeEqual(tokenBuffer, expectedBuffer)
}

// Get token from request
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check header first (preferred)
  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken) return headerToken

  // Fallback to cookie
  const cookie = request.headers.get('cookie')
  return parseCookie(cookie, 'csrf_token')
}

// Validate for state-changing operations
export async function validateCsrfForRequest(
  request: Request,
): Promise<boolean> {
  const method = request.method.toUpperCase()

  // Only validate state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }

  const token = getCsrfTokenFromRequest(request)
  const expectedToken = parseCookie(request.headers.get('cookie'), 'csrf_token')

  if (!token || !expectedToken) return false

  return validateCsrfToken(token, expectedToken)
}
```

## Input Validation

### String Validation

```typescript
// Basic required string
if (!email?.trim()) {
  return simpleErrorResponse('Email is required')
}

// Email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  return simpleErrorResponse('Invalid email format')
}

// Length limits
if (name.length > 255) {
  return simpleErrorResponse('Name too long')
}
```

### Password Validation

```typescript
// src/lib/password-validation.ts
export function validatePassword(password: string): {
  valid: boolean
  error?: string
} {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' }
  }

  return { valid: true }
}
```

### Localized Content Validation

```typescript
type LocalizedString = { en: string; fr?: string; id?: string }

function validateLocalizedString(
  value: unknown,
  fieldName: string,
): string | null {
  if (!value || typeof value !== 'object') {
    return `${fieldName} must be an object`
  }

  if (!('en' in value) || !(value as LocalizedString).en?.trim()) {
    return `${fieldName} must have a non-empty "en" property`
  }

  return null
}

// Usage
const nameError = validateLocalizedString(body.name, 'Name')
if (nameError) {
  return simpleErrorResponse(nameError)
}
```

### UUID Validation

```typescript
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Usage
if (!isValidUUID(params.resourceId)) {
  return simpleErrorResponse('Invalid resource ID', 400)
}
```

## Secure Error Handling

```typescript
// src/lib/api.ts
export function errorResponse(
  message: string,
  error: unknown,
  status: number = 500,
): Response {
  // Log full error server-side
  console.error(`[ERROR] ${message}:`, error)

  // Return sanitized message to client
  const isDev = process.env.NODE_ENV === 'development'

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      // Only include details in development
      ...(isDev &&
        error instanceof Error && {
          details: error.message,
          stack: error.stack,
        }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
```

## Timing Attack Prevention

```typescript
// WRONG: Leaks timing information
if (user.password !== inputPassword) {
  return { error: 'Invalid password' }
}

// RIGHT: Constant-time comparison
import { verify } from 'bcrypt-ts'
const isValid = await verify(inputPassword, user.passwordHash)
if (!isValid) {
  return { error: 'Invalid credentials' }
}

// For tokens
import { timingSafeEqual } from 'crypto'
const isValidToken = timingSafeEqual(
  Buffer.from(inputToken),
  Buffer.from(expectedToken),
)
```

## Checkout Security

```typescript
// src/lib/checkout-auth.ts
import { createHmac } from 'crypto'

const SECRET = process.env.CHECKOUT_SECRET!

export function generateCheckoutToken(checkoutId: string): string {
  return createHmac('sha256', SECRET).update(checkoutId).digest('hex')
}

export function validateCheckoutToken(
  checkoutId: string,
  token: string,
): boolean {
  const expected = generateCheckoutToken(checkoutId)
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

export async function validateCheckoutAccess(
  request: Request,
  checkoutId: string,
): Promise<{ valid: boolean; error?: string }> {
  // Get checkout
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { valid: false, error: 'Checkout not found' }
  }

  if (checkout.completedAt) {
    return { valid: false, error: 'Checkout already completed' }
  }

  if (checkout.expiresAt < new Date()) {
    return { valid: false, error: 'Checkout expired' }
  }

  // Validate token
  const token = parseCookie(request.headers.get('cookie'), 'checkout_session')
  if (!token || !validateCheckoutToken(checkoutId, token)) {
    return { valid: false, error: 'Invalid checkout session' }
  }

  return { valid: true }
}
```

## Webhook Security

```typescript
// Stripe webhook verification
import Stripe from 'stripe'

POST: async ({ request }) => {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await request.text()

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )

    // Process verified event
    await handleStripeEvent(event)

    return new Response('OK')
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }
}
```

## Security Headers

```typescript
// Add to responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
}
```

## Audit Checklist

Run this checklist for every new endpoint:

```markdown
## Endpoint: [METHOD] /api/[path]

### Authentication

- [ ] Uses requireAuth() or requireAdmin()
- [ ] Returns 401/403 for unauthorized access
- [ ] Session validated before any database access

### Rate Limiting

- [ ] checkRateLimit() called before auth
- [ ] Appropriate tier selected (auth/api/webhook)
- [ ] 429 response includes Retry-After header

### Input Validation

- [ ] All required fields checked
- [ ] String lengths validated
- [ ] Format validation (email, UUID, etc.)
- [ ] Localized strings have 'en' property

### Data Access

- [ ] User can only access their own data
- [ ] Admin endpoints verify admin role
- [ ] No SQL injection (using Drizzle)

### Error Handling

- [ ] Errors logged server-side
- [ ] No sensitive data in error responses
- [ ] Generic messages for auth failures

### Response

- [ ] No sensitive fields exposed (passwordHash, tokens)
- [ ] Appropriate status codes
```

## See Also

- `src/lib/auth.ts` - Authentication utilities
- `src/lib/rate-limit.ts` - Rate limiting
- `src/lib/csrf.ts` - CSRF protection
- `src/lib/password-validation.ts` - Password rules
- `src/lib/checkout-auth.ts` - Checkout session auth
