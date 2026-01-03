/**
 * Server Function Middleware
 *
 * Standardized middleware for TanStack Start server functions.
 * Based on: https://tanstack.com/start/latest/docs/framework/react/guide/middleware
 *
 * Usage:
 *   import { authMiddleware, adminMiddleware } from './middleware'
 *
 *   export const myServerFn = createServerFn()
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       // context.user is available and typed
 *       return { userId: context.user.userId }
 *     })
 */

import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

import { getAppSession, type SessionUser } from './session'

// ============================================
// TYPES
// ============================================

export type AuthContext = {
  user: SessionUser
}

export type AdminContext = AuthContext & {
  user: SessionUser & { role: 'admin' }
}

// ============================================
// AUTH MIDDLEWARE
// ============================================

/**
 * Authentication middleware - requires a valid session
 *
 * Adds `context.user` with { userId, email, role } to the handler.
 * Redirects to /admin/login if not authenticated.
 *
 * Usage:
 *   createServerFn()
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       console.log(context.user.userId)
 *     })
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await getAppSession()
    const data = session.data

    if (!data?.userId || !data.email || !data.role) {
      throw redirect({ to: '/' })
    }

    return next({
      context: {
        user: {
          userId: data.userId,
          email: data.email,
          role: data.role,
        },
      },
    })
  },
)

/**
 * Admin middleware - requires admin role
 *
 * Chains authMiddleware, then checks for admin role.
 * Throws 403 error if user is not an admin.
 *
 * Usage:
 *   createServerFn()
 *     .middleware([adminMiddleware])
 *     .handler(async ({ context }) => {
 *       // context.user.role is 'admin'
 *     })
 */
export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.user.role !== 'admin') {
      throw new Error('Admin access required')
    }

    return next({
      context: {
        user: context.user as SessionUser & { role: 'admin' },
      },
    })
  })
