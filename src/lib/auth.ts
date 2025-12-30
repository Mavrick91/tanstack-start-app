import { hash, compare } from 'bcrypt-ts'
import { and, eq, gt } from 'drizzle-orm'

import { validateCsrf } from './csrf'
import { db } from '../db'
import { sessions, users } from '../db/schema'

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return await compare(password, passwordHash)
}

/**
 * Parse cookies from request header, handling values with '=' characters
 */
export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return undefined

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const idx = cookie.indexOf('=')
      if (idx !== -1) {
        const key = cookie.substring(0, idx).trim()
        const value = cookie.substring(idx + 1).trim()
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, string>,
  )

  return cookies[name]
}

/**
 * Validate session and return user if authenticated
 */
export async function validateSession(request: Request) {
  const sessionId = getCookie(request, 'session')

  if (!sessionId) {
    return { success: false as const, error: 'Not authenticated', status: 401 }
  }

  // Find valid session (not expired)
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))

  if (!session) {
    return { success: false as const, error: 'Session expired', status: 401 }
  }

  // Get user
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))

  if (!user) {
    return { success: false as const, error: 'User not found', status: 401 }
  }

  return { success: true as const, user, sessionId }
}

/**
 * Require authentication and valid CSRF token
 * Returns error Response if invalid, otherwise returns user + session
 */
export async function requireAuthWithCsrf(
  request: Request,
): Promise<
  | {
      success: true
      user: { id: string; email: string; role: string }
      sessionId: string
    }
  | Response
> {
  const sessionId = getCookie(request, 'session')

  // Check CSRF first for state-changing requests
  const csrfError = validateCsrf(request, sessionId)
  if (csrfError) {
    return csrfError
  }

  const result = await validateSession(request)

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { success: true, user: result.user, sessionId: result.sessionId! }
}

/**
 * Require admin role with CSRF validation
 */
export async function requireAdminWithCsrf(
  request: Request,
): Promise<
  | {
      success: true
      user: { id: string; email: string; role: string }
      sessionId: string
    }
  | Response
> {
  const result = await requireAuthWithCsrf(request)

  if (result instanceof Response) {
    return result
  }

  if (result.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return result
}
