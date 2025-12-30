import { createFileRoute } from '@tanstack/react-router'

import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../../lib/api'
import { validateCheckoutAccess } from '../../../../../lib/checkout-auth'
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
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
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
