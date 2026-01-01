import { createFileRoute } from '@tanstack/react-router'

import { registerCustomerFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await registerCustomerFn({ data: body })
          return Response.json(result)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Registration failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})
