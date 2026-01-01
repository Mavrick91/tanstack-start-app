import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { users, customers, sessions } from '../../../../db/schema'
import {
  exchangeCodeForTokens,
  getGoogleUser,
} from '../../../../features/auth/lib/google-oauth'
import type { SessionUser } from '../../../../server/auth'

// Session helper - must match the one in auth.ts
const getAppSession = () => {
  return useSession<SessionUser>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  })
}

export const Route = createFileRoute('/api/auth/google/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state') || '/en/account'
        const error = url.searchParams.get('error')
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

        if (error) {
          return Response.redirect(`${baseUrl}/en/auth?error=oauth_denied`)
        }

        if (!code) {
          return Response.redirect(`${baseUrl}/en/auth?error=missing_code`)
        }

        try {
          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(code)
          const googleUser = await getGoogleUser(tokens.access_token)

          // Try to find user by googleId first
          let [user] = await db
            .select()
            .from(users)
            .where(eq(users.googleId, googleUser.id))

          if (!user) {
            // Try to find by email
            const [existingUser] = await db
              .select()
              .from(users)
              .where(eq(users.email, googleUser.email))

            if (existingUser) {
              // Link Google ID to existing user
              await db
                .update(users)
                .set({
                  googleId: googleUser.id,
                  emailVerified: true,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, existingUser.id))
              user = existingUser
            } else {
              // Create new user
              const [newUser] = await db
                .insert(users)
                .values({
                  email: googleUser.email,
                  passwordHash: '', // No password for Google users
                  googleId: googleUser.id,
                  emailVerified: true,
                })
                .returning()
              user = newUser

              // Check for guest customer
              const [existingCustomer] = await db
                .select()
                .from(customers)
                .where(eq(customers.email, googleUser.email))

              if (existingCustomer) {
                // Link customer to new user
                await db
                  .update(customers)
                  .set({ userId: user.id, updatedAt: new Date() })
                  .where(eq(customers.id, existingCustomer.id))
              } else {
                // Create customer record
                await db.insert(customers).values({
                  userId: user.id,
                  email: googleUser.email,
                  firstName: googleUser.given_name || null,
                  lastName: googleUser.family_name || null,
                })
              }
            }
          }

          // Create DB session (for audit/revocation)
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          await db.insert(sessions).values({ userId: user.id, expiresAt })

          // Set TanStack session (this is what getMeFn checks)
          const session = await getAppSession()
          await session.update({
            userId: user.id,
            email: user.email,
            role: user.role,
          })

          // Get the session cookie that was set
          const { getResponseHeaders } =
            await import('@tanstack/react-start/server')
          const responseHeaders = getResponseHeaders()
          const setCookie = responseHeaders?.get('set-cookie')

          // Redirect to return URL with session cookie
          const headers = new Headers()
          headers.set('Location', `${baseUrl}${state}`)
          if (setCookie) {
            headers.set('Set-Cookie', setCookie)
          }

          return new Response(null, {
            status: 302,
            headers,
          })
        } catch (err) {
          console.error('Google OAuth error:', err)
          return Response.redirect(`${baseUrl}/en/auth?error=oauth_failed`)
        }
      },
    },
  },
})
