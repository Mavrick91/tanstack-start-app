// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */
import { describe, expect, it, vi } from 'vitest'

// Import the actual redirect function and createFileRoute
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    redirect: actual.redirect,
    createFileRoute: actual.createFileRoute,
  }
})

import { redirect } from '@tanstack/react-router'
import { Route } from '@/routes/admin/_authed'

describe('Admin _authed route', () => {
  describe('beforeLoad', () => {
    describe('unauthenticated user redirect', () => {
      it('should redirect to homepage (/) when user is null', async () => {
        const context = {
          user: null,
        }

        try {
          // @ts-expect-error - Testing with minimal context
          await Route.options.beforeLoad({ context })
          // Should not reach here - expect redirect
          expect.fail('Expected redirect to be thrown')
        } catch (error) {
          // Verify it's a redirect to the homepage (not /admin/login)
          expect(error).toEqual(redirect({ to: '/' }))
        }
      })

      it('should redirect to homepage (/) when user is undefined', async () => {
        const context = {
          user: undefined,
        }

        try {
          // @ts-expect-error - Testing with minimal context
          await Route.options.beforeLoad({ context })
          // Should not reach here - expect redirect
          expect.fail('Expected redirect to be thrown')
        } catch (error) {
          // Verify it's a redirect to the homepage (not /admin/login)
          expect(error).toEqual(redirect({ to: '/' }))
        }
      })
    })

    describe('non-admin user redirect', () => {
      it('should redirect to homepage (/) when user role is customer', async () => {
        const context = {
          user: {
            id: 1,
            email: 'customer@example.com',
            role: 'customer',
          },
        }

        try {
          // @ts-expect-error - Testing with minimal context
          await Route.options.beforeLoad({ context })
          // Should not reach here - expect redirect
          expect.fail('Expected redirect to be thrown')
        } catch (error) {
          // Verify non-admin users are redirected to homepage
          expect(error).toEqual(redirect({ to: '/' }))
        }
      })

      it('should redirect to homepage (/) when user role is invalid', async () => {
        const context = {
          user: {
            id: 1,
            email: 'user@example.com',
            role: 'invalid-role',
          },
        }

        try {
          // @ts-expect-error - Testing with minimal context and invalid role
          await Route.options.beforeLoad({ context })
          // Should not reach here - expect redirect
          expect.fail('Expected redirect to be thrown')
        } catch (error) {
          // Verify users with invalid roles are redirected
          expect(error).toEqual(redirect({ to: '/' }))
        }
      })
    })

    describe('successful authentication', () => {
      it('should allow admin user through and pass user to context', async () => {
        const adminUser = {
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
        }

        const context = {
          user: adminUser,
        }

        // @ts-expect-error - Testing with minimal context
        const result = await Route.options.beforeLoad({ context })

        // Verify admin user is allowed through
        expect(result).toEqual({ user: adminUser })
      })

      it('should pass through the exact user object from parent context', async () => {
        const adminUser = {
          id: 999,
          email: 'superadmin@example.com',
          role: 'admin',
          extraField: 'should-be-preserved',
        }

        const context = {
          user: adminUser,
        }

        // @ts-expect-error - Testing with minimal context and extra fields
        const result = await Route.options.beforeLoad({ context })

        // Verify the exact user object is passed through unchanged
        expect(result.user).toBe(adminUser)
      })
    })
  })
})
