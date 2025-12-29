import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../../db'
import { checkouts } from '../../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../../lib/api'
import {
  createPaymentIntent,
  dollarsToCents,
  getStripePublishableKey,
} from '../../../../../lib/stripe'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/payment/stripe',
)({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const { checkoutId } = params

          // Get checkout
          const [checkout] = await db
            .select()
            .from(checkouts)
            .where(eq(checkouts.id, checkoutId))
            .limit(1)

          if (!checkout) {
            return simpleErrorResponse('Checkout not found', 404)
          }

          if (checkout.expiresAt < new Date()) {
            return simpleErrorResponse('Checkout has expired', 410)
          }

          if (checkout.completedAt) {
            return simpleErrorResponse(
              'Checkout has already been completed',
              410,
            )
          }

          // Validate checkout is ready for payment
          if (!checkout.email) {
            return simpleErrorResponse('Customer email is required')
          }

          if (!checkout.shippingAddress) {
            return simpleErrorResponse('Shipping address is required')
          }

          if (!checkout.shippingRateId) {
            return simpleErrorResponse('Shipping method is required')
          }

          // Create Stripe PaymentIntent
          const totalInCents = dollarsToCents(parseFloat(checkout.total))

          const { clientSecret, paymentIntentId } = await createPaymentIntent({
            amount: totalInCents,
            currency: checkout.currency.toLowerCase(),
            metadata: {
              checkoutId: checkout.id,
              email: checkout.email,
            },
          })

          return successResponse({
            clientSecret,
            paymentIntentId,
            publishableKey: getStripePublishableKey(),
          })
        } catch (error) {
          return errorResponse('Failed to create payment intent', error)
        }
      },
    },
  },
})
