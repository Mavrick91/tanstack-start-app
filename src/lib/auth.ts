import { hash, compare } from 'bcrypt-ts'
import { and, eq, gt } from 'drizzle-orm'

import { validateCsrf } from './csrf'
import { db } from '../db'
import { simpleErrorResponse } from './api'
import { sessions, users } from '../db/schema'
import { getCookie } from './utils/session'

// Re-export for backward compatibility
export { getCookie }

export const hashPassword = async (password: string) => {
  return await hash(password, 10)
}

export const verifyPassword = async (
  password: string,
  passwordHash: string,
) => {
  return await compare(password, passwordHash)
}

export const validateSession = async (request: Request) => {
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
export const requireAuthWithCsrf = async (request: Request) => {
  const sessionId = getCookie(request, 'session')

  // Check CSRF first for state-changing requests
  const csrfError = validateCsrf(request, sessionId)
  if (csrfError) {
    return csrfError
  }

  const result = await validateSession(request)

  if (!result.success) {
    return simpleErrorResponse(result.error, result.status)
  }

  return { success: true, user: result.user, sessionId: result.sessionId! }
}

/**
 * Require admin role with CSRF validation
 */
export const requireAdminWithCsrf = async (request: Request) => {
  const result = await requireAuthWithCsrf(request)

  if (result instanceof Response) {
    return result
  }

  if (result.user.role !== 'admin') {
    return simpleErrorResponse('Admin access required', 403)
  }

  return result
}
