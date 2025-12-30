import { createFileRoute } from '@tanstack/react-router'
import { and, desc, eq, isNotNull } from 'drizzle-orm'

import { db } from '../../../db'
import {
  users,
  customers,
  sessions,
  checkouts,
  addresses,
} from '../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../lib/api'
import { hashPassword } from '../../../lib/auth'
import { validatePassword } from '../../../lib/password-validation'
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from '../../../lib/rate-limit'
import { validateEmail, normalizeEmail } from '../../../lib/validation'

export const Route = createFileRoute('/api/customers/register')({
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
          const {
            email,
            password,
            firstName,
            lastName,
            phone,
            acceptsMarketing,
          } = body

          // Validate required fields
          const emailResult = validateEmail(email)
          if (!emailResult.valid) {
            return simpleErrorResponse(emailResult.error)
          }

          const passwordValidation = validatePassword(password)
          if (!passwordValidation.valid) {
            return simpleErrorResponse(passwordValidation.error!)
          }

          // Check if user already exists
          const normalized = normalizeEmail(email)
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalized))
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
                email: normalized,
                passwordHash,
                role: 'user',
              })
              .returning()

            const [newCustomer] = await tx
              .insert(customers)
              .values({
                userId: newUser.id,
                email: normalized,
                firstName: firstName?.trim() || null,
                lastName: lastName?.trim() || null,
                phone: phone?.trim() || null,
                acceptsMarketing: acceptsMarketing || false,
              })
              .returning()

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            const [session] = await tx
              .insert(sessions)
              .values({
                userId: newUser.id,
                expiresAt,
              })
              .returning()

            // Check for existing customer record (guest) with same email and pending saved address
            const [existingGuestCustomer] = await tx
              .select()
              .from(customers)
              .where(
                and(
                  eq(customers.email, normalized),
                  eq(customers.userId, null as unknown as string),
                ),
              )
              .limit(1)

            if (existingGuestCustomer) {
              // Link guest customer to new user
              await tx
                .update(customers)
                .set({ userId: newUser.id })
                .where(eq(customers.id, existingGuestCustomer.id))

              // Check for checkouts with pending save address flag
              const [checkoutWithPendingAddress] = await tx
                .select()
                .from(checkouts)
                .where(
                  and(
                    eq(checkouts.customerId, existingGuestCustomer.id),
                    eq(checkouts.pendingSaveAddress, true),
                    isNotNull(checkouts.shippingAddress),
                  ),
                )
                .orderBy(desc(checkouts.createdAt))
                .limit(1)

              // Save the shipping address from their checkout if they wanted it saved
              if (checkoutWithPendingAddress?.shippingAddress) {
                const addr = checkoutWithPendingAddress.shippingAddress
                await tx.insert(addresses).values({
                  customerId: existingGuestCustomer.id,
                  type: 'shipping',
                  firstName: addr.firstName,
                  lastName: addr.lastName,
                  company: addr.company || null,
                  address1: addr.address1,
                  address2: addr.address2 || null,
                  city: addr.city,
                  province: addr.province || null,
                  provinceCode: addr.provinceCode || null,
                  country: addr.country,
                  countryCode: addr.countryCode,
                  zip: addr.zip,
                  phone: addr.phone || null,
                  isDefault: true,
                })

                // Clear the pending flag
                await tx
                  .update(checkouts)
                  .set({ pendingSaveAddress: false })
                  .where(eq(checkouts.id, checkoutWithPendingAddress.id))
              }
            }

            return { user: newUser, customer: newCustomer, session }
          })

          // Set session cookie
          const response = successResponse({
            user: {
              id: result.user.id,
              email: result.user.email,
            },
            customer: {
              id: result.customer.id,
              firstName: result.customer.firstName,
              lastName: result.customer.lastName,
            },
          })

          response.headers.set(
            'Set-Cookie',
            `session=${result.session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
          )

          return response
        } catch (error) {
          return errorResponse('Failed to register customer', error)
        }
      },
    },
  },
})
