import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'

export const Route = createFileRoute('/api/checkout/$checkoutId/')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { checkoutId } = params

          const [checkout] = await db
            .select()
            .from(checkouts)
            .where(eq(checkouts.id, checkoutId))
            .limit(1)

          if (!checkout) {
            return simpleErrorResponse('Checkout not found', 404)
          }

          // Check if checkout is expired
          if (checkout.expiresAt < new Date()) {
            return simpleErrorResponse('Checkout has expired', 410)
          }

          // Check if checkout is already completed
          if (checkout.completedAt) {
            return simpleErrorResponse(
              'Checkout has already been completed',
              410,
            )
          }

          return successResponse({
            checkout: {
              id: checkout.id,
              email: checkout.email,
              customerId: checkout.customerId,
              cartItems: checkout.cartItems,
              subtotal: parseFloat(checkout.subtotal),
              shippingTotal: parseFloat(checkout.shippingTotal || '0'),
              taxTotal: parseFloat(checkout.taxTotal || '0'),
              total: parseFloat(checkout.total),
              currency: checkout.currency,
              shippingAddress: checkout.shippingAddress,
              billingAddress: checkout.billingAddress,
              shippingRateId: checkout.shippingRateId,
              shippingMethod: checkout.shippingMethod,
              expiresAt: checkout.expiresAt,
            },
          })
        } catch (error) {
          return errorResponse('Failed to fetch checkout', error)
        }
      },
    },
  },
})
