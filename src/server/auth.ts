import { createServerFn } from '@tanstack/react-start'
import { getRequest, useSession } from '@tanstack/react-start/server'
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
export const useAppSession = () => {
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
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    // Rate limiting
    const request = getRequest()
    if (!request) throw new Error('No request found')
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
