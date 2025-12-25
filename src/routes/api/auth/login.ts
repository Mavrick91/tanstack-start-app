import { createFileRoute } from '@tanstack/react-router'
import { compare } from 'bcrypt-ts'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { sessions, users } from '../../../db/schema'

// Session expires in 7 days
const SESSION_EXPIRY_DAYS = 7

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

          // Create session
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

          const [session] = await db
            .insert(sessions)
            .values({
              userId: user.id,
              expiresAt,
            })
            .returning()

          // Set HTTP-only cookie
          const cookieOptions = [
            `session=${session.id}`,
            `Path=/`,
            `HttpOnly`,
            `SameSite=Lax`,
            `Expires=${expiresAt.toUTCString()}`,
          ]

          // Add Secure flag in production
          if (process.env.NODE_ENV === 'production') {
            cookieOptions.push('Secure')
          }

          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                role: user.role,
              },
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookieOptions.join('; '),
              },
            },
          )
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
