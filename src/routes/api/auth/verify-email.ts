import { createFileRoute } from '@tanstack/react-router'

import { verifyEmailFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/verify-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await verifyEmailFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Verification failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
