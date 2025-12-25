import { createFileRoute } from '@tanstack/react-router'

import { validateSession } from '../../../lib/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const result = await validateSession(request)

          if (!result.success) {
            return Response.json(
              { success: false, error: result.error },
              { status: result.status },
            )
          }

          return Response.json({
            success: true,
            user: result.user,
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
