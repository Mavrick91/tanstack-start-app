import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, requireAuth, successResponse } from '../../../lib/api'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          return successResponse({ user: auth.user })
        } catch (error) {
          return errorResponse('Auth check failed', error)
        }
      },
    },
  },
})
