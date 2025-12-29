import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { customers } from '../../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'

export const Route = createFileRoute('/api/customers/me/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          // Get customer profile linked to user
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          return successResponse({
            customer: {
              id: customer.id,
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              acceptsMarketing: customer.acceptsMarketing,
              createdAt: customer.createdAt,
            },
          })
        } catch (error) {
          return errorResponse('Failed to fetch customer profile', error)
        }
      },

      PATCH: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const body = await request.json()
          const { firstName, lastName, phone, acceptsMarketing } = body

          // Get customer profile
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          // Update customer
          const [updatedCustomer] = await db
            .update(customers)
            .set({
              firstName:
                firstName !== undefined
                  ? firstName?.trim() || null
                  : customer.firstName,
              lastName:
                lastName !== undefined
                  ? lastName?.trim() || null
                  : customer.lastName,
              phone:
                phone !== undefined ? phone?.trim() || null : customer.phone,
              acceptsMarketing:
                acceptsMarketing !== undefined
                  ? acceptsMarketing
                  : customer.acceptsMarketing,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id))
            .returning()

          return successResponse({
            customer: {
              id: updatedCustomer.id,
              email: updatedCustomer.email,
              firstName: updatedCustomer.firstName,
              lastName: updatedCustomer.lastName,
              phone: updatedCustomer.phone,
              acceptsMarketing: updatedCustomer.acceptsMarketing,
            },
          })
        } catch (error) {
          return errorResponse('Failed to update customer profile', error)
        }
      },
    },
  },
})
