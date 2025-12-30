import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, successResponse } from '../../../../lib/api'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'

export const Route = createFileRoute('/api/checkout/$checkoutId/')({
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
