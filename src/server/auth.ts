/**
 * Auth Server Functions
 *
 * Uses standardized patterns:
 * - Top-level imports for database
 * - Error helpers for consistent responses
 *
 * Note: These functions are pre-auth or foundational, so they
 * don't use authMiddleware/adminMiddleware (which depend on these).
 */

import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { getAppSession, type SessionUser } from './session'
import { sessions, users } from '../db/schema'

// Re-export SessionUser for consumers
export type { SessionUser }

// ============================================
// SCHEMAS
// ============================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ============================================
// SERVER FUNCTIONS
// ============================================

/**
 * Login server function
 * Handles email/password authentication with rate limiting
 */
export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    // Dynamic imports to prevent server code leaking to client
    const { getRequest } = await import('@tanstack/react-start/server')
    const { verifyPassword } = await import('../lib/auth')
    const { checkRateLimit, getRateLimitKey } =
      await import('../lib/rate-limit')

    // Rate limiting
    const request = getRequest()
    if (!request) {
      throw new Error('No request found')
    }

    const key = getRateLimitKey(request)
    const rateLimit = await checkRateLimit('auth', key)

    if (!rateLimit.allowed) {
      throw new Error('Too many attempts. Please try again later.')
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Check if user has a password (Google OAuth users don't)
    if (!user.passwordHash) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const validPassword = await verifyPassword(data.password, user.passwordHash)
    if (!validPassword) {
      throw new Error('Invalid email or password')
    }

    // Create DB session (for audit/revocation)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.insert(sessions).values({ userId: user.id, expiresAt })

    // Set cookie session
    const session = await getAppSession()
    await session.update({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return { user: { id: user.id, email: user.email, role: user.role } }
  })

/**
 * Logout server function
 * Clears session from database and cookie
 */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getAppSession()
  const data = session.data

  if (data?.userId) {
    // Clear DB sessions for this user
    await db.delete(sessions).where(eq(sessions.userId, data.userId))
  }

  await session.clear()
  return { success: true }
})

/**
 * Get current user server function
 * Returns null if not authenticated (doesn't throw)
 */
export const getMeFn = createServerFn().handler(async () => {
  const session = await getAppSession()
  const data = session.data

  if (!data?.userId || !data.email || !data.role) {
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
