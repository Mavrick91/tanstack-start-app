import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts, customers, users } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { hashPassword } from '../../../../lib/auth'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'

export const Route = createFileRoute('/api/checkout/$checkoutId/customer')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.clone().json()
          const { email, firstName, lastName, createAccount, password } = body

          if (!email?.trim()) {
            return simpleErrorResponse('Email is required')
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            return simpleErrorResponse('Invalid email format')
          }

          const access = await validateCheckoutAccess(checkoutId, request)
          if (!access.valid) {
            const status =
              access.error === 'Checkout not found'
                ? 404
                : access.error === 'Unauthorized'
                  ? 403
                  : 410
            return new Response(JSON.stringify({ error: access.error }), {
              status,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const checkout = access.checkout!
          let customerId = checkout.customerId

          // If creating account, create user first
          if (createAccount && password) {
            if (password.length < 8) {
              return simpleErrorResponse(
                'Password must be at least 8 characters',
              )
            }

            // Check if user already exists
            const [existingUser] = await db
              .select()
              .from(users)
              .where(eq(users.email, email.toLowerCase()))
              .limit(1)

            if (existingUser) {
              return simpleErrorResponse(
                'An account with this email already exists',
              )
            }

            // Create user and customer in transaction
            const result = await db.transaction(async (tx) => {
              const passwordHash = await hashPassword(password)

              const [newUser] = await tx
                .insert(users)
                .values({
                  email: email.toLowerCase(),
                  passwordHash,
                  role: 'user',
                })
                .returning()

              const [newCustomer] = await tx
                .insert(customers)
                .values({
                  userId: newUser.id,
                  email: email.toLowerCase(),
                  firstName: firstName?.trim() || null,
                  lastName: lastName?.trim() || null,
                })
                .returning()

              return { user: newUser, customer: newCustomer }
            })

            customerId = result.customer.id
          } else if (!customerId) {
            // Create guest customer
            const [existingCustomer] = await db
              .select()
              .from(customers)
              .where(eq(customers.email, email.toLowerCase()))
              .limit(1)

            if (existingCustomer && !existingCustomer.userId) {
              // Reuse existing guest customer
              customerId = existingCustomer.id
            } else if (!existingCustomer) {
              // Create new guest customer
              const [newCustomer] = await db
                .insert(customers)
                .values({
                  email: email.toLowerCase(),
                  firstName: firstName?.trim() || null,
                  lastName: lastName?.trim() || null,
                })
                .returning()

              customerId = newCustomer.id
            }
          }

          // Update checkout with customer info
          const [updatedCheckout] = await db
            .update(checkouts)
            .set({
              customerId,
              email: email.toLowerCase(),
              updatedAt: new Date(),
            })
            .where(eq(checkouts.id, checkoutId))
            .returning()

          return successResponse({
            checkout: {
              id: updatedCheckout.id,
              email: updatedCheckout.email,
              customerId: updatedCheckout.customerId,
            },
          })
        } catch (error) {
          return errorResponse('Failed to save customer info', error)
        }
      },
    },
  },
})
