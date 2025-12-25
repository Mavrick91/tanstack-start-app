import { createFileRoute } from '@tanstack/react-router'
import { and, eq, gt } from 'drizzle-orm'

import { db } from '../../../db'
import { sessions, users } from '../../../db/schema'

// Helper to parse cookies from request
function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return undefined

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>,
  )

  return cookies[name]
}

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const sessionId = getCookie(request, 'session')

          if (!sessionId) {
            return Response.json(
              { success: false, error: 'Not authenticated' },
              { status: 401 },
            )
          }

          // Find valid session (not expired)
          const [session] = await db
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.id, sessionId),
                gt(sessions.expiresAt, new Date()),
              ),
            )

          if (!session) {
            return Response.json(
              { success: false, error: 'Session expired' },
              { status: 401 },
            )
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
            return Response.json(
              { success: false, error: 'User not found' },
              { status: 401 },
            )
          }

          return Response.json({
            success: true,
            user,
          })
        } catch (error) {
          console.error('Auth check error:', error)
          return Response.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
