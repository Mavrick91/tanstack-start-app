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
  '/api/checkout/$checkoutId/shipping-method',
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.json()
          const { shippingRateId } = body

          if (!shippingRateId) {
            return simpleErrorResponse('Shipping rate is required')
          }

          // Validate shipping rate
          const rate = SHIPPING_RATES.find((r) => r.id === shippingRateId)
          if (!rate) {
            return simpleErrorResponse('Invalid shipping rate')
          }

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

          // Calculate shipping cost (free if over threshold for standard)
          const subtotal = parseFloat(checkout.subtotal)
          const shippingTotal =
            shippingRateId === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD
              ? 0
              : rate.price

          // Calculate new total
          const taxTotal = parseFloat(checkout.taxTotal || '0')
          const total = subtotal + shippingTotal + taxTotal

          // Update checkout
          const [updatedCheckout] = await db
            .update(checkouts)
            .set({
              shippingRateId,
              shippingMethod: rate.name,
              shippingTotal: shippingTotal.toFixed(2),
              total: total.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(checkouts.id, checkoutId))
            .returning()

          return successResponse({
            checkout: {
              id: updatedCheckout.id,
              shippingRateId: updatedCheckout.shippingRateId,
              shippingMethod: updatedCheckout.shippingMethod,
              shippingTotal: parseFloat(updatedCheckout.shippingTotal || '0'),
              total: parseFloat(updatedCheckout.total),
            },
          })
        } catch (error) {
          return errorResponse('Failed to save shipping method', error)
        }
      },
    },
  },
})
