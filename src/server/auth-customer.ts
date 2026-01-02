import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { generateToken, hashToken, generateExpiresAt } from '../lib/tokens'

const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:3000'
}

// ============================================
// REGISTER
// ============================================

const langSchema = z.enum(['en', 'fr', 'id']).default('en')

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  lang: langSchema,
})

export const registerCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const { checkRateLimit, getRateLimitKey } =
      await import('../lib/rate-limit')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../db')
    const { users, customers, emailVerificationTokens } =
      await import('../db/schema')
    const { sendVerificationEmail } = await import('../lib/email')

    // Rate limiting
    const request = getRequest()
    if (request) {
      const key = getRateLimitKey(request)
      const rateLimit = await checkRateLimit('auth', key)
      if (!rateLimit.allowed) {
        throw Response.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429 },
        )
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
        throw Response.json(
          { error: 'An account with this email already exists. Please login.' },
          { status: 409 },
        )
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

      const verifyUrl = `${getBaseUrl()}/${data.lang}/auth/verify?token=${token}`
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
    const verifyUrl = `${getBaseUrl()}/${data.lang}/auth/verify?token=${token}`
    const emailResult = await sendVerificationEmail({ email, verifyUrl })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail registration, user can request resend
    }

    return { success: true, message: 'Verification email sent' }
  })

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
    const { and, gt, eq } = await import('drizzle-orm')
    const { hashPassword } = await import('../lib/auth')
    const { db } = await import('../db')
    const { users, customers, emailVerificationTokens, sessions } =
      await import('../db/schema')

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
      throw Response.json(
        { error: 'Invalid or expired token' },
        { status: 400 },
      )
    }

    if (tokenRecord.usedAt) {
      throw Response.json(
        { error: 'This link has already been used' },
        { status: 400 },
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))

    if (!user) {
      throw Response.json({ error: 'User not found' }, { status: 404 })
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
    await db.insert(sessions).values({ userId: user.id, expiresAt })

    // Set cookie session using shared helper
    const { getAppSession } = await import('./session')
    const appSession = await getAppSession()
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

// ============================================
// FORGOT PASSWORD
// ============================================

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  lang: langSchema,
})

export const forgotPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => forgotPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const { checkRateLimit, getRateLimitKey } =
      await import('../lib/rate-limit')
    const { sendPasswordResetEmail } = await import('../lib/email')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../db')
    const { users, emailVerificationTokens } = await import('../db/schema')

    // Rate limiting (stricter for password reset)
    const request = getRequest()
    if (request) {
      const key = getRateLimitKey(request)
      const rateLimit = await checkRateLimit('auth', key)
      if (!rateLimit.allowed) {
        // Always return success to prevent email enumeration
        return {
          success: true,
          message: 'If an account exists, a reset email has been sent',
        }
      }
    }

    const email = data.email.toLowerCase().trim()

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email))

    // Always return success to prevent email enumeration
    if (!user || !user.emailVerified) {
      return {
        success: true,
        message: 'If an account exists, a reset email has been sent',
      }
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
    const resetUrl = `${getBaseUrl()}/${data.lang}/auth/reset-password?token=${token}`
    await sendPasswordResetEmail({
      email,
      resetToken: token,
      resetUrl,
    })

    return {
      success: true,
      message: 'If an account exists, a reset email has been sent',
    }
  })

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
    const { and, gt, eq } = await import('drizzle-orm')
    const { hashPassword } = await import('../lib/auth')
    const { db } = await import('../db')
    const { users, emailVerificationTokens } = await import('../db/schema')

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
      throw Response.json(
        { error: 'Invalid or expired token' },
        { status: 400 },
      )
    }

    if (tokenRecord.usedAt) {
      throw Response.json(
        { error: 'This link has already been used' },
        { status: 400 },
      )
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))

    if (!user) {
      throw Response.json({ error: 'User not found' }, { status: 404 })
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
