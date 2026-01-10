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
import { eq } from 'drizzle-orm'

import { db } from '../db'
import { customers } from '../db/schema'
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

export type CustomerContext = AuthContext & {
  customer: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    acceptsMarketing: boolean | null
    userId: string | null
    createdAt: Date
    updatedAt: Date
  }
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

/**
 * Customer middleware - requires authenticated user with customer profile
 *
 * Chains authMiddleware, then fetches the customer record for the user.
 * Throws error if no customer profile exists.
 *
 * Usage:
 *   createServerFn()
 *     .middleware([customerMiddleware])
 *     .handler(async ({ context }) => {
 *       // context.user and context.customer are available
 *       console.log(context.customer.id)
 *     })
 */
export const customerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, context.user.userId))
      .limit(1)

    if (!customer) {
      throw new Error('Customer profile not found')
    }

    return next({
      context: {
        user: context.user,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          acceptsMarketing: customer.acceptsMarketing,
          userId: customer.userId,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
    })
  })
