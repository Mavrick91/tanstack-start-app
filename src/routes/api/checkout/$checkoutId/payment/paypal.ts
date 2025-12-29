import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../../db'
import { checkouts } from '../../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../../lib/api'
import { createPayPalOrder, getPayPalClientId } from '../../../../../lib/paypal'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/payment/paypal',
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

          // Create PayPal order with customer info pre-filled
          const total = parseFloat(checkout.total)
          const shippingAddr = checkout.shippingAddress

          const { orderId } = await createPayPalOrder({
            amount: total,
            currency: checkout.currency,
            description: `Order from checkout ${checkout.id}`,
            checkoutId: checkout.id,
            email: checkout.email,
            shippingAddress: shippingAddr
              ? {
                  firstName: shippingAddr.firstName,
                  lastName: shippingAddr.lastName,
                  address1: shippingAddr.address1,
                  address2: shippingAddr.address2,
                  city: shippingAddr.city,
                  province:
                    shippingAddr.province || shippingAddr.provinceCode || '',
                  zip: shippingAddr.zip,
                  countryCode: shippingAddr.countryCode,
                  phone: shippingAddr.phone,
                }
              : undefined,
          })

          return successResponse({
            orderId,
            clientId: getPayPalClientId(),
          })
        } catch (error) {
          return errorResponse('Failed to create PayPal order', error)
        }
      },
    },
  },
})
