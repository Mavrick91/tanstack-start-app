# Customer Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement customer login/register with email verification and Google OAuth.

**Architecture:** Feature-based folder structure under `src/features/auth/`. Email verification uses hashed tokens with 24h expiry. Google OAuth is direct implementation without library. Auth modal uses TanStack Router's conditional render pattern (no redirect, show modal over dimmed content).

**Tech Stack:** TanStack Start, TanStack Router, Drizzle ORM, SendGrid, Radix UI Dialog/Tabs, Zustand, bcrypt-ts, crypto (Node.js)

---

## Task 1: Database Schema - Add User Columns

**Files:**
- Modify: `src/db/schema.ts:15-22`
- Create: `drizzle/XXXX_add_auth_columns.sql` (generated)

**Step 1: Add emailVerified and googleId columns to users table**

In `src/db/schema.ts`, modify the `users` table:

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Changed: now nullable for Google OAuth users
  role: text('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Step 2: Generate migration**

Run: `npm run db:generate`

Expected: New migration file created in `drizzle/` folder

**Step 3: Apply migration**

Run: `npm run db:migrate`

Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(auth): add emailVerified and googleId columns to users"
```

---

## Task 2: Database Schema - Create Email Verification Tokens Table

**Files:**
- Modify: `src/db/schema.ts` (add after sessions table)

**Step 1: Add emailVerificationTokens table**

Add after the `sessions` table definition (around line 31):

```typescript
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  type: text('type').notNull(), // 'verify_email' | 'reset_password'
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Step 2: Generate and apply migration**

Run: `npm run db:generate && npm run db:migrate`

Expected: Migration created and applied

**Step 3: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(auth): add email_verification_tokens table"
```

---

## Task 3: Token Utilities

**Files:**
- Create: `src/lib/tokens.ts`
- Test: `src/lib/tokens.test.ts`

**Step 1: Write the failing test**

Create `src/lib/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateToken, hashToken, generateExpiresAt } from './tokens'

describe('tokens', () => {
  describe('generateToken', () => {
    it('generates a 64-character hex string', () => {
      const token = generateToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[a-f0-9]+$/)
    })

    it('generates unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashToken', () => {
    it('returns a 64-character hex string', () => {
      const hash = hashToken('test-token')
      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('returns consistent hash for same input', () => {
      const hash1 = hashToken('test-token')
      const hash2 = hashToken('test-token')
      expect(hash1).toBe(hash2)
    })

    it('returns different hash for different input', () => {
      const hash1 = hashToken('token-1')
      const hash2 = hashToken('token-2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateExpiresAt', () => {
    it('generates date 24 hours in future for verify_email', () => {
      const now = Date.now()
      const expires = generateExpiresAt('verify_email')
      const diff = expires.getTime() - now
      // Allow 1 second tolerance
      expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000)
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 1000)
    })

    it('generates date 1 hour in future for reset_password', () => {
      const now = Date.now()
      const expires = generateExpiresAt('reset_password')
      const diff = expires.getTime() - now
      expect(diff).toBeGreaterThan(60 * 60 * 1000 - 1000)
      expect(diff).toBeLessThan(60 * 60 * 1000 + 1000)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tokens.test.ts`

Expected: FAIL with "Cannot find module './tokens'"

**Step 3: Write minimal implementation**

Create `src/lib/tokens.ts`:

```typescript
import { randomBytes, createHash } from 'crypto'

export type TokenType = 'verify_email' | 'reset_password'

/**
 * Generate a cryptographically secure random token (32 bytes = 64 hex chars)
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token using SHA-256 for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate expiration date based on token type
 * - verify_email: 24 hours
 * - reset_password: 1 hour
 */
export function generateExpiresAt(type: TokenType): Date {
  const now = new Date()
  if (type === 'verify_email') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
  return new Date(now.getTime() + 60 * 60 * 1000)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tokens.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tokens.ts src/lib/tokens.test.ts
git commit -m "feat(auth): add token generation utilities"
```

---

## Task 4: Email Verification Email Template

**Files:**
- Modify: `src/lib/email.ts`

**Step 1: Add email verification types and function**

Add to `src/lib/email.ts` after the existing interfaces (around line 37):

```typescript
export interface VerificationEmailData {
  email: string
  verifyUrl: string
  firstName?: string
}
```

**Step 2: Add HTML template generator**

Add after `generatePasswordResetHtml` function (around line 253):

```typescript
const generateVerificationEmailHtml = (data: VerificationEmailData) => {
  const greeting = data.firstName ? `Hi ${data.firstName},` : 'Hi,'
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        ${greeting}<br><br>
        Click the button below to verify your email and set your password.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Set Password
        </a>
      </div>

      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

      <p style="color: #999; font-size: 12px; margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.verifyUrl}" style="color: #ec4899; word-break: break-all;">${data.verifyUrl}</a>
      </p>
    </div>

    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} FineNail. All rights reserved.
    </p>
  </div>
</body>
</html>
  `
}
```

**Step 3: Add sendVerificationEmail function**

Add after `sendPasswordResetEmail` function:

```typescript
export const sendVerificationEmail = async (data: VerificationEmailData) => {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email service not configured' }
  }

  if (!data.email) {
    return { success: false, error: 'Email address is required' }
  }

  if (!initializeSendGrid()) {
    return { success: false, error: 'Failed to initialize email service' }
  }

  try {
    await sgMail.send({
      to: data.email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'Verify Your FineNail Account',
      html: generateVerificationEmailHtml(data),
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(auth): add email verification email template"
```

---

## Task 5: Auth Server Functions - Register

**Files:**
- Create: `src/server/auth-customer.ts`
- Test: `src/server/auth-customer.test.ts`

**Step 1: Write the failing test**

Create `src/server/auth-customer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'user-123', email: 'test@example.com' }]),
      })),
    })),
  },
}))

// Mock email
vi.mock('../lib/email', () => ({
  sendVerificationEmail: vi.fn(() => ({ success: true })),
  isEmailConfigured: vi.fn(() => true),
}))

describe('registerCustomerFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', async () => {
    const { registerCustomerFn } = await import('./auth-customer')
    expect(registerCustomerFn).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/auth-customer.test.ts`

Expected: FAIL with "Cannot find module './auth-customer'"

**Step 3: Write the implementation**

Create `src/server/auth-customer.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { users, customers, emailVerificationTokens } from '../db/schema'
import { sendVerificationEmail } from '../lib/email'
import { generateToken, hashToken, generateExpiresAt } from '../lib/tokens'

const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:3000'
}

// ============================================
// REGISTER
// ============================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const registerCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const { checkRateLimit, getRateLimitKey } = await import('../lib/rate-limit')

    // Rate limiting
    const request = getRequest()
    if (request) {
      const key = getRateLimitKey(request)
      const rateLimit = await checkRateLimit('auth', key)
      if (!rateLimit.allowed) {
        throw new Error('Too many attempts. Please try again later.')
      }
    }

    const email = data.email.toLowerCase().trim()

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new Error('An account with this email already exists. Please login.')
      }
      // User exists but not verified - resend verification email
      const token = generateToken()
      const tokenHash = hashToken(token)

      await db.insert(emailVerificationTokens).values({
        userId: existingUser.id,
        tokenHash,
        type: 'verify_email',
        expiresAt: generateExpiresAt('verify_email'),
      })

      const verifyUrl = `${getBaseUrl()}/en/auth/verify?token=${token}`
      await sendVerificationEmail({ email, verifyUrl })

      return { success: true, message: 'Verification email sent' }
    }

    // Create new unverified user (no password yet)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash: '', // Will be set during verification
        emailVerified: false,
      })
      .returning()

    // Check if guest customer exists with this email
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))

    if (!existingCustomer) {
      // Create customer record
      await db.insert(customers).values({
        userId: newUser.id,
        email,
      })
    }
    // Note: We don't link the customer yet - that happens after verification

    // Create verification token
    const token = generateToken()
    const tokenHash = hashToken(token)

    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      tokenHash,
      type: 'verify_email',
      expiresAt: generateExpiresAt('verify_email'),
    })

    // Send verification email
    const verifyUrl = `${getBaseUrl()}/en/auth/verify?token=${token}`
    const emailResult = await sendVerificationEmail({ email, verifyUrl })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail registration, user can request resend
    }

    return { success: true, message: 'Verification email sent' }
  })
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/auth-customer.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/auth-customer.ts src/server/auth-customer.test.ts
git commit -m "feat(auth): add customer registration server function"
```

---

## Task 6: Auth Server Functions - Verify Email

**Files:**
- Modify: `src/server/auth-customer.ts`

**Step 1: Add verify email schema and function**

Add to `src/server/auth-customer.ts`:

```typescript
// ============================================
// VERIFY EMAIL & SET PASSWORD
// ============================================

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
})

export const verifyEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => verifyEmailSchema.parse(data))
  .handler(async ({ data }) => {
    const { and, gt } = await import('drizzle-orm')
    const { hashPassword } = await import('../lib/auth')
    const { sessions } = await import('../db/schema')

    const tokenHash = hashToken(data.token)

    // Find valid, unused token
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          eq(emailVerificationTokens.type, 'verify_email'),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )

    if (!tokenRecord) {
      throw new Error('Invalid or expired token')
    }

    if (tokenRecord.usedAt) {
      throw new Error('This link has already been used')
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))

    if (!user) {
      throw new Error('User not found')
    }

    // Hash password and update user
    const passwordHash = await hashPassword(data.password)

    await db
      .update(users)
      .set({
        passwordHash,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Mark token as used
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenRecord.id))

    // Link any existing guest customer to this user
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, user.email))

    if (existingCustomer && !existingCustomer.userId) {
      await db
        .update(customers)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(eq(customers.id, existingCustomer.id))
    }

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const [session] = await db
      .insert(sessions)
      .values({ userId: user.id, expiresAt })
      .returning()

    // Set cookie session using TanStack Start
    const { useSession } = await import('@tanstack/react-start/server')
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const appSession = useSession({
      name: 'app-session',
      password: process.env.SESSION_SECRET!,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      },
    })
    await appSession.update({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    }
  })
```

**Step 2: Commit**

```bash
git add src/server/auth-customer.ts
git commit -m "feat(auth): add email verification server function"
```

---

## Task 7: Auth Server Functions - Forgot Password

**Files:**
- Modify: `src/server/auth-customer.ts`

**Step 1: Add forgot password function**

Add to `src/server/auth-customer.ts`:

```typescript
// ============================================
// FORGOT PASSWORD
// ============================================

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const forgotPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => forgotPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const { checkRateLimit, getRateLimitKey } = await import('../lib/rate-limit')
    const { sendPasswordResetEmail } = await import('../lib/email')

    // Rate limiting (stricter for password reset)
    const request = getRequest()
    if (request) {
      const key = getRateLimitKey(request)
      const rateLimit = await checkRateLimit('auth', key)
      if (!rateLimit.allowed) {
        // Always return success to prevent email enumeration
        return { success: true, message: 'If an account exists, a reset email has been sent' }
      }
    }

    const email = data.email.toLowerCase().trim()

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    // Always return success to prevent email enumeration
    if (!user || !user.emailVerified) {
      return { success: true, message: 'If an account exists, a reset email has been sent' }
    }

    // Create reset token
    const token = generateToken()
    const tokenHash = hashToken(token)

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash,
      type: 'reset_password',
      expiresAt: generateExpiresAt('reset_password'),
    })

    // Send reset email
    const resetUrl = `${getBaseUrl()}/en/auth/reset-password?token=${token}`
    await sendPasswordResetEmail({
      email,
      resetToken: token,
      resetUrl,
    })

    return { success: true, message: 'If an account exists, a reset email has been sent' }
  })
```

**Step 2: Commit**

```bash
git add src/server/auth-customer.ts
git commit -m "feat(auth): add forgot password server function"
```

---

## Task 8: Auth Server Functions - Reset Password

**Files:**
- Modify: `src/server/auth-customer.ts`

**Step 1: Add reset password function**

Add to `src/server/auth-customer.ts`:

```typescript
// ============================================
// RESET PASSWORD
// ============================================

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
})

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => resetPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const { and, gt } = await import('drizzle-orm')
    const { hashPassword } = await import('../lib/auth')

    const tokenHash = hashToken(data.token)

    // Find valid, unused token
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          eq(emailVerificationTokens.type, 'reset_password'),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )

    if (!tokenRecord) {
      throw new Error('Invalid or expired token')
    }

    if (tokenRecord.usedAt) {
      throw new Error('This link has already been used')
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))

    if (!user) {
      throw new Error('User not found')
    }

    // Hash password and update user
    const passwordHash = await hashPassword(data.password)

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    // Mark token as used
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenRecord.id))

    return { success: true }
  })
```

**Step 2: Commit**

```bash
git add src/server/auth-customer.ts
git commit -m "feat(auth): add reset password server function"
```

---

## Task 9: Google OAuth - URL Builder & Callback Handler

**Files:**
- Create: `src/features/auth/lib/google-oauth.ts`

**Step 1: Create Google OAuth utilities**

Create directory and file:

```bash
mkdir -p src/features/auth/lib
```

Create `src/features/auth/lib/google-oauth.ts`:

```typescript
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export function getGoogleAuthUrl(returnUrl?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnUrl || '/en/account',
    access_type: 'offline',
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  id_token: string
  refresh_token?: string
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  return response.json()
}

export async function getGoogleUser(accessToken: string): Promise<{
  id: string
  email: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google user info')
  }

  return response.json()
}
```

**Step 2: Commit**

```bash
git add src/features/auth/lib/google-oauth.ts
git commit -m "feat(auth): add Google OAuth utilities"
```

---

## Task 10: Google OAuth API Routes

**Files:**
- Create: `src/routes/api/auth/google/index.ts`
- Create: `src/routes/api/auth/google/callback.ts`

**Step 1: Create Google OAuth redirect route**

Create `src/routes/api/auth/google/index.ts`:

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

import { getGoogleAuthUrl } from '../../../../features/auth/lib/google-oauth'

export const Route = createFileRoute('/api/auth/google/')({
  loader: ({ request }) => {
    const url = new URL(request.url)
    const returnUrl = url.searchParams.get('returnUrl') || '/en/account'

    const googleUrl = getGoogleAuthUrl(returnUrl)
    throw redirect({ href: googleUrl })
  },
})
```

**Step 2: Create Google OAuth callback route**

Create `src/routes/api/auth/google/callback.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { users, customers, sessions } from '../../../../db/schema'
import {
  exchangeCodeForTokens,
  getGoogleUser,
} from '../../../../features/auth/lib/google-oauth'

export const Route = createFileRoute('/api/auth/google/callback')({
  loader: async ({ request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') || '/en/account'
    const error = url.searchParams.get('error')

    if (error) {
      return Response.redirect(`${process.env.BASE_URL}/en/auth?error=oauth_denied`)
    }

    if (!code) {
      return Response.redirect(`${process.env.BASE_URL}/en/auth?error=missing_code`)
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code)
      const googleUser = await getGoogleUser(tokens.access_token)

      // Try to find user by googleId first
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleUser.id))

      if (!user) {
        // Try to find by email
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleUser.email))

        if (existingUser) {
          // Link Google ID to existing user
          await db
            .update(users)
            .set({ googleId: googleUser.id, emailVerified: true, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id))
          user = existingUser
        } else {
          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email: googleUser.email,
              passwordHash: '', // No password for Google users
              googleId: googleUser.id,
              emailVerified: true,
            })
            .returning()
          user = newUser

          // Check for guest customer
          const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.email, googleUser.email))

          if (existingCustomer) {
            // Link customer to new user
            await db
              .update(customers)
              .set({ userId: user.id, updatedAt: new Date() })
              .where(eq(customers.id, existingCustomer.id))
          } else {
            // Create customer record
            await db.insert(customers).values({
              userId: user.id,
              email: googleUser.email,
              firstName: googleUser.given_name || null,
              lastName: googleUser.family_name || null,
            })
          }
        }
      }

      // Create session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const [session] = await db
        .insert(sessions)
        .values({ userId: user.id, expiresAt })
        .returning()

      // Set cookies
      const cookieOptions = [
        `session=${session.id}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Expires=${expiresAt.toUTCString()}`,
      ]

      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure')
      }

      // Redirect to return URL with session cookie
      const response = Response.redirect(`${process.env.BASE_URL}${state}`)
      response.headers.append('Set-Cookie', cookieOptions.join('; '))

      return response
    } catch (err) {
      console.error('Google OAuth error:', err)
      return Response.redirect(`${process.env.BASE_URL}/en/auth?error=oauth_failed`)
    }
  },
})
```

**Step 3: Commit**

```bash
git add src/routes/api/auth/google/
git commit -m "feat(auth): add Google OAuth API routes"
```

---

## Task 11: Customer Auth API Routes

**Files:**
- Create: `src/routes/api/auth/register.ts`
- Create: `src/routes/api/auth/verify-email.ts`
- Create: `src/routes/api/auth/forgot-password.ts`
- Create: `src/routes/api/auth/reset-password.ts`

**Step 1: Create register route**

Create `src/routes/api/auth/register.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { registerCustomerFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await registerCustomerFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
```

**Step 2: Create verify-email route**

Create `src/routes/api/auth/verify-email.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { verifyEmailFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/verify-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await verifyEmailFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Verification failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
```

**Step 3: Create forgot-password route**

Create `src/routes/api/auth/forgot-password.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { forgotPasswordFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/forgot-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await forgotPasswordFn({ data: body })
          return Response.json(result)
        } catch (error) {
          return Response.json(
            { success: true, message: 'If an account exists, a reset email has been sent' },
          )
        }
      },
    },
  },
})
```

**Step 4: Create reset-password route**

Create `src/routes/api/auth/reset-password.ts`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { resetPasswordFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/reset-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await resetPasswordFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Password reset failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
```

**Step 5: Commit**

```bash
git add src/routes/api/auth/register.ts src/routes/api/auth/verify-email.ts src/routes/api/auth/forgot-password.ts src/routes/api/auth/reset-password.ts
git commit -m "feat(auth): add customer auth API routes"
```

---

## Task 12: Auth Modal Store

**Files:**
- Create: `src/features/auth/hooks/useAuthModal.ts`

**Step 1: Create auth modal Zustand store**

Create directories:

```bash
mkdir -p src/features/auth/hooks
```

Create `src/features/auth/hooks/useAuthModal.ts`:

```typescript
import { create } from 'zustand'

type AuthView = 'login' | 'register' | 'forgot-password'

type AuthModalState = {
  isOpen: boolean
  view: AuthView
  returnUrl: string | null
  open: (view?: AuthView, returnUrl?: string) => void
  close: () => void
  setView: (view: AuthView) => void
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'login',
  returnUrl: null,
  open: (view = 'login', returnUrl = null) =>
    set({ isOpen: true, view, returnUrl }),
  close: () => set({ isOpen: false, returnUrl: null }),
  setView: (view) => set({ view }),
}))
```

**Step 2: Commit**

```bash
git add src/features/auth/hooks/useAuthModal.ts
git commit -m "feat(auth): add auth modal Zustand store"
```

---

## Task 13: Google Button Component

**Files:**
- Create: `src/features/auth/components/GoogleButton.tsx`

**Step 1: Create Google OAuth button**

Create directory:

```bash
mkdir -p src/features/auth/components
```

Create `src/features/auth/components/GoogleButton.tsx`:

```typescript
import { Button } from '@/components/ui/button'

interface GoogleButtonProps {
  returnUrl?: string
}

export function GoogleButton({ returnUrl }: GoogleButtonProps) {
  const handleClick = () => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''
    window.location.href = `/api/auth/google${params}`
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/GoogleButton.tsx
git commit -m "feat(auth): add Google OAuth button component"
```

---

## Task 14: Login Form Component

**Files:**
- Create: `src/features/auth/components/LoginForm.tsx`

**Step 1: Create login form**

Create `src/features/auth/components/LoginForm.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'
import { useAuthStore } from '@/hooks/useAuth'
import { useAuthModal } from '../hooks/useAuthModal'

const loginFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: '••••••••',
      required: true,
    },
  ],
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const { close, setView, returnUrl } = useAuthModal()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)
    setIsLoading(true)

    try {
      const result = await login(
        values.email as string,
        values.password as string,
      )

      if (result.success) {
        close()
        if (returnUrl) {
          navigate({ to: returnUrl })
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={loginFormDefinition}
        onSubmit={handleSubmit}
        submitLabel={isLoading ? 'Signing in...' : 'Sign in'}
        disabled={isLoading}
      />

      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-primary"
        onClick={() => setView('forgot-password')}
      >
        Forgot your password?
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx
git commit -m "feat(auth): add login form component"
```

---

## Task 15: Register Form Component

**Files:**
- Create: `src/features/auth/components/RegisterForm.tsx`

**Step 1: Create register form**

Create `src/features/auth/components/RegisterForm.tsx`:

```typescript
import { useState } from 'react'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const registerFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
  ],
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center">
        <h3 className="font-medium text-green-800">Check your email</h3>
        <p className="mt-1 text-sm text-green-700">
          We sent you a verification link. Click the link to set your password
          and activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={registerFormDefinition}
        onSubmit={handleSubmit}
        submitLabel={isLoading ? 'Creating account...' : 'Create account'}
        disabled={isLoading}
      />

      <p className="text-xs text-muted-foreground">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/RegisterForm.tsx
git commit -m "feat(auth): add register form component"
```

---

## Task 16: Forgot Password Form Component

**Files:**
- Create: `src/features/auth/components/ForgotPasswordForm.tsx`

**Step 1: Create forgot password form**

Create `src/features/auth/components/ForgotPasswordForm.tsx`:

```typescript
import { useState } from 'react'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'
import { useAuthModal } from '../hooks/useAuthModal'

const forgotPasswordFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
  ],
}

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { setView } = useAuthModal()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })

      // Always show success to prevent email enumeration
      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4 text-center">
          <h3 className="font-medium text-green-800">Check your email</h3>
          <p className="mt-1 text-sm text-green-700">
            If an account exists with that email, we sent you a password reset
            link.
          </p>
        </div>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:text-primary"
          onClick={() => setView('login')}
        >
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      <FNForm
        formDefinition={forgotPasswordFormDefinition}
        onSubmit={handleSubmit}
        submitLabel={isLoading ? 'Sending...' : 'Send reset link'}
        disabled={isLoading}
      />

      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-primary"
        onClick={() => setView('login')}
      >
        Back to login
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/ForgotPasswordForm.tsx
git commit -m "feat(auth): add forgot password form component"
```

---

## Task 17: Password Setup Form Component

**Files:**
- Create: `src/features/auth/components/PasswordSetupForm.tsx`

**Step 1: Create password setup form**

Create `src/features/auth/components/PasswordSetupForm.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

interface PasswordSetupFormProps {
  token: string
  type: 'verify' | 'reset'
}

const passwordFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: '••••••••',
      required: true,
      validate: (value: unknown) => {
        const password = value as string
        if (password.length < 8) {
          return 'Password must be at least 8 characters'
        }
        if (!/\d/.test(password)) {
          return 'Password must contain at least one number'
        }
        return undefined
      },
    },
    {
      name: 'confirmPassword',
      type: 'password',
      label: 'Confirm Password',
      placeholder: '••••••••',
      required: true,
    },
  ],
}

export function PasswordSetupForm({ token, type }: PasswordSetupFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const endpoint =
        type === 'verify' ? '/api/auth/verify-email' : '/api/auth/reset-password'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to set password')
        return
      }

      // Redirect to account page on success
      navigate({ to: '/en/account' })
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={passwordFormDefinition}
        onSubmit={handleSubmit}
        submitLabel={isLoading ? 'Setting password...' : 'Set password'}
        disabled={isLoading}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/PasswordSetupForm.tsx
git commit -m "feat(auth): add password setup form component"
```

---

## Task 18: Auth Form Component (Tabs)

**Files:**
- Create: `src/features/auth/components/AuthForm.tsx`

**Step 1: Create auth form with tabs**

Create `src/features/auth/components/AuthForm.tsx`:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthModal } from '../hooks/useAuthModal'
import { GoogleButton } from './GoogleButton'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

interface AuthFormProps {
  defaultView?: 'login' | 'register'
}

export function AuthForm({ defaultView = 'login' }: AuthFormProps) {
  const { view, setView, returnUrl } = useAuthModal()
  const currentView = view || defaultView

  if (currentView === 'forgot-password') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Reset Password</h2>
        </div>
        <ForgotPasswordForm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={currentView}
        onValueChange={(value) => setView(value as 'login' | 'register')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-6 space-y-6">
          <LoginForm />
        </TabsContent>

        <TabsContent value="register" className="mt-6 space-y-6">
          <RegisterForm />
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleButton returnUrl={returnUrl || undefined} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/AuthForm.tsx
git commit -m "feat(auth): add auth form component with tabs"
```

---

## Task 19: Auth Modal Component

**Files:**
- Create: `src/features/auth/components/AuthModal.tsx`

**Step 1: Create auth modal**

Create `src/features/auth/components/AuthModal.tsx`:

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthModal } from '../hooks/useAuthModal'
import { AuthForm } from './AuthForm'

interface AuthModalProps {
  defaultOpen?: boolean
  defaultView?: 'login' | 'register'
}

export function AuthModal({ defaultOpen, defaultView }: AuthModalProps) {
  const { isOpen, close, view } = useAuthModal()
  const open = defaultOpen !== undefined ? defaultOpen : isOpen

  return (
    <Dialog open={open} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {view === 'login' ? 'Login' : view === 'register' ? 'Create Account' : 'Reset Password'}
          </DialogTitle>
        </DialogHeader>
        <AuthForm defaultView={defaultView || 'login'} />
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/AuthModal.tsx
git commit -m "feat(auth): add auth modal component"
```

---

## Task 20: Feature Index Export

**Files:**
- Create: `src/features/auth/index.ts`

**Step 1: Create public exports**

Create `src/features/auth/index.ts`:

```typescript
// Components
export { AuthModal } from './components/AuthModal'
export { AuthForm } from './components/AuthForm'
export { GoogleButton } from './components/GoogleButton'
export { LoginForm } from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { ForgotPasswordForm } from './components/ForgotPasswordForm'
export { PasswordSetupForm } from './components/PasswordSetupForm'

// Hooks
export { useAuthModal } from './hooks/useAuthModal'

// Lib
export { getGoogleAuthUrl } from './lib/google-oauth'
```

**Step 2: Commit**

```bash
git add src/features/auth/index.ts
git commit -m "feat(auth): add feature index exports"
```

---

## Task 21: Auth Page Routes

**Files:**
- Create: `src/routes/$lang/auth/index.tsx`
- Create: `src/routes/$lang/auth/verify.tsx`
- Create: `src/routes/$lang/auth/forgot-password.tsx`
- Create: `src/routes/$lang/auth/reset-password.tsx`

**Step 1: Create auth index page**

Create `src/routes/$lang/auth/index.tsx`:

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { AuthForm, useAuthModal } from '@/features/auth'
import { getCustomerSessionFn } from '@/server/customers'

export const Route = createFileRoute('/$lang/auth/')({
  component: AuthPage,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000,
    })
    return { customer: session.customer }
  },
})

function AuthPage() {
  const { customer } = Route.useRouteContext()
  const { lang } = Route.useParams()
  const navigate = useNavigate()
  const { open } = useAuthModal()

  useEffect(() => {
    if (customer) {
      navigate({ to: '/$lang/account', params: { lang } })
    } else {
      open('login')
    }
  }, [customer, navigate, lang, open])

  if (customer) return null

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthForm defaultView="login" />
      </div>
    </div>
  )
}
```

**Step 2: Create verify page**

Create `src/routes/$lang/auth/verify.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { PasswordSetupForm } from '@/features/auth'

export const Route = createFileRoute('/$lang/auth/verify')({
  component: VerifyPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})

function VerifyPage() {
  const { token } = Route.useSearch()

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">
            This verification link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set Your Password</h1>
          <p className="mt-2 text-muted-foreground">
            Create a password to complete your account setup.
          </p>
        </div>
        <PasswordSetupForm token={token} type="verify" />
      </div>
    </div>
  )
}
```

**Step 3: Create forgot-password page**

Create `src/routes/$lang/auth/forgot-password.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordForm, useAuthModal } from '@/features/auth'
import { useEffect } from 'react'

export const Route = createFileRoute('/$lang/auth/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { setView } = useAuthModal()

  useEffect(() => {
    setView('forgot-password')
  }, [setView])

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
```

**Step 4: Create reset-password page**

Create `src/routes/$lang/auth/reset-password.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { PasswordSetupForm } from '@/features/auth'

export const Route = createFileRoute('/$lang/auth/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">
            This password reset link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your new password below.
          </p>
        </div>
        <PasswordSetupForm token={token} type="reset" />
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/routes/\$lang/auth/
git commit -m "feat(auth): add auth page routes"
```

---

## Task 22: Update Account Layout (Modal Pattern)

**Files:**
- Modify: `src/routes/$lang/account.tsx`

**Step 1: Update account layout to use modal pattern**

Replace the contents of `src/routes/$lang/account.tsx`:

```typescript
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AuthModal } from '@/features/auth'
import {
  getCustomerSessionFn,
  type CustomerProfile,
} from '../../server/customers'

function AccountLayout() {
  const { customer, isLoading } = Route.useRouteContext()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!customer) {
    return (
      <>
        <AuthModal defaultOpen defaultView="login" />
        <div className="pointer-events-none opacity-50">
          <Outlet />
        </div>
      </>
    )
  }

  return <Outlet />
}

export const Route = createFileRoute('/$lang/account')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000,
    })

    return { customer: session.customer, isLoading: false }
  },
  component: AccountLayout,
})

export type AccountRouteContext = {
  customer: CustomerProfile
}
```

**Step 2: Commit**

```bash
git add src/routes/\$lang/account.tsx
git commit -m "feat(auth): update account layout to use modal pattern"
```

---

## Task 23: Add Login Button to Header

**Files:**
- Modify: `src/components/layout/Header.tsx` (or equivalent header component)

**Step 1: Find and update header component**

First, find the header component:

Run: `find src -name "*[Hh]eader*" -type f`

Then add the auth modal trigger. The implementation will vary based on your header structure, but add:

```typescript
import { Link } from '@tanstack/react-router'
import { User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AuthModal, useAuthModal } from '@/features/auth'
import { useAuthStore } from '@/hooks/useAuth'

// Inside your header component:
function HeaderAuthButton() {
  const { isAuthenticated } = useAuthStore()
  const { open } = useAuthModal()

  if (isAuthenticated) {
    return (
      <Link to="/$lang/account" params={{ lang: 'en' }}>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </Link>
    )
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => open('login')}>
        <User className="h-5 w-5" />
      </Button>
      <AuthModal />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/layout/
git commit -m "feat(auth): add login button to header"
```

---

## Task 24: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm run test`

Expected: All tests pass

**Step 2: Run type check**

Run: `npm run typecheck`

Expected: No type errors

**Step 3: Run linter**

Run: `npm run lint`

Expected: No lint errors

**Step 4: Fix any issues found**

If tests, types, or lint fail, fix the issues and re-run.

**Step 5: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve test/type/lint issues"
```

---

## Task 25: Manual Testing Checklist

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test registration flow**

1. Go to `/en/auth`
2. Click "Register" tab
3. Enter email, submit
4. Check terminal for email log (or actual email if configured)
5. Visit verification link
6. Set password
7. Verify redirect to account page

**Step 3: Test login flow**

1. Logout (clear cookies or use logout button)
2. Go to `/en/auth`
3. Enter email and password
4. Verify redirect to account page

**Step 4: Test Google OAuth flow**

1. Logout
2. Go to `/en/auth`
3. Click "Continue with Google"
4. Complete Google sign-in
5. Verify redirect to account page

**Step 5: Test forgot password flow**

1. Logout
2. Go to `/en/auth`
3. Click "Forgot your password?"
4. Enter email, submit
5. Check for reset email
6. Visit reset link
7. Set new password
8. Verify can login with new password

**Step 6: Test account guard modal**

1. Logout
2. Go directly to `/en/account`
3. Verify modal appears over dimmed content
4. Login via modal
5. Verify content becomes active

**Step 7: Final commit**

```bash
git add .
git commit -m "feat(auth): complete customer authentication feature"
```

---

## Environment Variables Checklist

Add to `.env`:

```env
# Existing
SESSION_SECRET=your-existing-session-secret

# SendGrid (already configured)
SENDGRID_API_KEY=SG.xxx

# Google OAuth (new)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# App URL
BASE_URL=http://localhost:3000
```

To get Google OAuth credentials:
1. Go to https://console.cloud.google.com
2. Create project or select existing
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Add `http://localhost:3000/api/auth/google/callback` as authorized redirect URI
