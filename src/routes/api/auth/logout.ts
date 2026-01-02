import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { sessions } from '../../../db/schema'
import { errorResponse } from '../../../lib/api'
import { getCookie, clearSessionCookie } from '../../../lib/utils/session'

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
              'Set-Cookie': clearSessionCookie(),
            },
          })
        } catch (error) {
          return errorResponse('Logout failed', error)
        }
      },
    },
  },
})
