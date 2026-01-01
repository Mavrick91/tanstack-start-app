import { createServerFn, json } from '@tanstack/react-start'
import { z } from 'zod'

// Session data type
export type SessionUser = {
  userId: string
  email: string
  role: string
}

// Session helper - uses dynamic import to prevent server code leaking to client
// Note: useSession here is TanStack Start's server session helper, not a React hook
const getAppSession = async () => {
  const { useSession } = await import('@tanstack/react-start/server')
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TanStack Start server session, not a React hook
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
    // Dynamic imports to prevent server code leaking to client
    const { getRequest } = await import('@tanstack/react-start/server')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../db')
    const { sessions, users } = await import('../db/schema')
    const { verifyPassword } = await import('../lib/auth')
    const { checkRateLimit, getRateLimitKey } =
      await import('../lib/rate-limit')

    // Rate limiting
    const request = getRequest()
    if (!request) throw json({ error: 'No request found' }, { status: 500 })
    const key = getRateLimitKey(request)
    const rateLimit = await checkRateLimit('auth', key)
    if (!rateLimit.allowed) {
      throw json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 },
      )
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))

    if (!user) {
      throw json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Verify password
    const validPassword = await verifyPassword(data.password, user.passwordHash)
    if (!validPassword) {
      throw json({ error: 'Invalid email or password' }, { status: 401 })
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

// Logout server function
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  // Dynamic imports to prevent server code leaking to client
  const { eq } = await import('drizzle-orm')
  const { db } = await import('../db')
  const { sessions } = await import('../db/schema')

  const session = await getAppSession()
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
  const session = await getAppSession()
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
