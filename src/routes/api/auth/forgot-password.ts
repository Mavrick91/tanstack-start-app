import { createFileRoute } from '@tanstack/react-router'

import { forgotPasswordFn } from '../../../server/auth-customer'

export const Route = createFileRoute('/api/auth/forgot-password')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const result = await forgotPasswordFn({ data: body })
          return Response.json(result)
        } catch {
          return Response.json({
            success: true,
            message: 'If an account exists, a reset email has been sent',
          })
        }
      },
    },
  },
})
