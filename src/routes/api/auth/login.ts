import { createFileRoute } from '@tanstack/react-router'
import { compare } from 'bcrypt-ts'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { sessions, users } from '../../../db/schema'
import { errorResponse, simpleErrorResponse } from '../../../lib/api'
import { generateSessionCsrfToken, createCsrfCookie } from '../../../lib/csrf'
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from '../../../lib/rate-limit'

// Session expires in 7 days
const SESSION_EXPIRY_DAYS = 7

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = getRateLimitKey(request)
          const rateLimit = await checkRateLimit('auth', key)
          if (!rateLimit.allowed) {
            return rateLimitResponse(rateLimit.retryAfter || 60)
          }

          const body = await request.json()
          const { email, password } = body

          if (!email || !password) {
            return simpleErrorResponse('Email and password required')
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))

          if (!user) {
            return simpleErrorResponse('Invalid email or password', 401)
          }

          // Check if user has a password (Google OAuth users don't)
          if (!user.passwordHash) {
            return simpleErrorResponse('Invalid email or password', 401)
          }

          const validPassword = await compare(password, user.passwordHash)

          if (!validPassword) {
            return simpleErrorResponse('Invalid email or password', 401)
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

          // Generate CSRF token for session
          const csrfToken = generateSessionCsrfToken(session.id)
          const csrfCookie = createCsrfCookie(csrfToken)

          const headers = new Headers()
          headers.set('Content-Type', 'application/json')
          headers.append('Set-Cookie', cookieOptions.join('; '))
          headers.append('Set-Cookie', csrfCookie)

          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                role: user.role,
              },
              csrfToken, // Also return in body for SPA usage
            }),
            {
              status: 200,
              headers,
            },
          )
        } catch (error) {
          return errorResponse('Login failed', error)
        }
      },
    },
  },
})
