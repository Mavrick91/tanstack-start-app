import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import {
  SHIPPING_RATES,
  FREE_SHIPPING_THRESHOLD,
} from '../../../../types/checkout'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/shipping-rates',
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
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
