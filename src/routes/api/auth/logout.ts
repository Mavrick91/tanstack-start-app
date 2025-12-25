import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { sessions } from '../../../db/schema'

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

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const sessionId = getCookie(request, 'session')

          if (sessionId) {
            // Delete session from database
            await db.delete(sessions).where(eq(sessions.id, sessionId))
          }

          // Clear the cookie
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie':
                'session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
            },
          })
        } catch (error) {
          console.error('Logout error:', error)
          return Response.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
