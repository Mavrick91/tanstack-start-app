import { and, eq, gt } from 'drizzle-orm'

import { db } from '../db'
import { sessions, users } from '../db/schema'

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

  return { success: true as const, user }
}
