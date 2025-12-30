import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, successResponse } from '../../../../lib/api'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'
import {
  SHIPPING_RATES,
  FREE_SHIPPING_THRESHOLD,
} from '../../../../types/checkout'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/shipping-rates',
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
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
          const subtotal = parseFloat(checkout.subtotal)
          const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD

          // Build shipping rates with free shipping indicator
          const rates = SHIPPING_RATES.map((rate) => ({
            id: rate.id,
            name: rate.name,
            price:
              rate.id === 'standard' && qualifiesForFreeShipping
                ? 0
                : rate.price,
            estimatedDays: rate.estimatedDays,
            isFree: rate.id === 'standard' && qualifiesForFreeShipping,
          }))

          return successResponse({
            shippingRates: rates,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            qualifiesForFreeShipping,
            amountUntilFreeShipping: qualifiesForFreeShipping
              ? 0
              : FREE_SHIPPING_THRESHOLD - subtotal,
          })
        } catch (error) {
          return errorResponse('Failed to fetch shipping rates', error)
        }
      },
    },
  },
})
