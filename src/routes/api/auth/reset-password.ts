import { createFileRoute } from '@tanstack/react-router'

import { resetPasswordFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/reset-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await resetPasswordFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Password reset failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
