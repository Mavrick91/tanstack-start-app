import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { generateToken, hashToken, generateExpiresAt } from '../lib/tokens'

const getBaseUrl = () => {
  return process.env.BASE_URL || 'http://localhost:3000'
}

// Helper to create a session for a user (reduces duplication in verify/login flows)
const createUserSession = async (user: { id: string; email: string; role: string }) => {
  const { db } = await import('../db')
  const { sessions } = await import('../db/schema')
  const { getAppSession, SESSION_DURATION_MS } = await import('./session')

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.insert(sessions).values({ userId: user.id, expiresAt })

  const appSession = await getAppSession()
  await appSession.update({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
}

// ============================================
// REGISTER
// ============================================

const langSchema = z.enum(['en', 'fr', 'id']).default('en')

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
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
        throw new Error('Too many attempts. Please try again later.')
      }
    }

    const email = data.email.toLowerCase().trim()

    // Check if user already exists (verified or unverified)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    if (existingUser) {
      // Error for any existing user (verified OR unverified)
      throw new Error(
        'An account with this email already exists. Please login instead.',
      )
    }

    // Hash password immediately
    const { hashPassword } = await import('../lib/auth')
    const passwordHash = await hashPassword(data.password)

    // Create new unverified user with password already set
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
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
})

export const verifyEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => verifyEmailSchema.parse(data))
  .handler(async ({ data }) => {
    const { and, eq } = await import('drizzle-orm')
    const { db } = await import('../db')
    const { users, customers, emailVerificationTokens } =
      await import('../db/schema')

    const tokenHash = hashToken(data.token)

    // Find token (including expired and used ones for smart handling)
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          eq(emailVerificationTokens.type, 'verify_email'),
        ),
      )

    if (!tokenRecord) {
      throw new Error('Invalid or expired token')
    }

    // Check if token expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired token')
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))

    if (!user) {
      throw new Error('User not found')
    }

    // Smart handling for already-used tokens
    if (tokenRecord.usedAt) {
      // If user already verified, auto-login them
      if (user.emailVerified) {
        await createUserSession(user)
        return {
          success: true,
          user: { id: user.id, email: user.email, role: user.role },
        }
      } else {
        // Token used but user not verified (shouldn't happen, but handle it)
        throw new Error('This link has already been used')
      }
    }

    // Update user to mark email as verified (password already set)
    await db
      .update(users)
      .set({
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
    await createUserSession(user)

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

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  lang: langSchema,
})

export const resendVerificationEmailFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => resendVerificationSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const { checkRateLimit, getRateLimitKey } =
      await import('../lib/rate-limit')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../db')
    const { users, emailVerificationTokens } = await import('../db/schema')
    const { sendVerificationEmail } = await import('../lib/email')

    // Rate limiting
    const request = getRequest()
    if (request) {
      const key = getRateLimitKey(request)
      const rateLimit = await checkRateLimit('auth', key)
      if (!rateLimit.allowed) {
        // Always return success to prevent email enumeration
        return {
          success: true,
          message: 'If an account exists, a verification email has been sent',
        }
      }
    }

    const email = data.email.toLowerCase().trim()

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email))

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists, a verification email has been sent',
      }
    }

    // If user already verified, return success without revealing this
    if (user.emailVerified) {
      return {
        success: true,
        message: 'If an account exists, a verification email has been sent',
      }
    }

    // User exists and not verified - send new verification email
    const token = generateToken()
    const tokenHash = hashToken(token)

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash,
      type: 'verify_email',
      expiresAt: generateExpiresAt('verify_email'),
    })

    // Send verification email
    const verifyUrl = `${getBaseUrl()}/${data.lang}/auth/verify?token=${token}`
    await sendVerificationEmail({ email, verifyUrl })

    return {
      success: true,
      message: 'If an account exists, a verification email has been sent',
    }
  })
