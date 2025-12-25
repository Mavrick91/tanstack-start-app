import { createFileRoute } from '@tanstack/react-router'
import { compare } from 'bcrypt-ts'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { users } from '../../../db/schema'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { email, password } = body

          if (!email || !password) {
            return Response.json(
              { success: false, error: 'Email and password required' },
              { status: 400 },
            )
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))

          if (!user) {
            return Response.json(
              { success: false, error: 'Invalid email or password' },
              { status: 401 },
            )
          }

          const validPassword = await compare(password, user.passwordHash)

          if (!validPassword) {
            return Response.json(
              { success: false, error: 'Invalid email or password' },
              { status: 401 },
            )
          }

          return Response.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
            },
          })
        } catch (error) {
          console.error('Login error:', error)
          return Response.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
