import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../../db'
import { checkouts } from '../../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../../lib/api'
import { capturePayPalOrder } from '../../../../../lib/paypal'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/payment/paypal/capture',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { checkoutId } = params
          const body = await request.json()
          const { orderId } = body

          if (!orderId) {
            return simpleErrorResponse('PayPal order ID is required')
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

          // Capture the PayPal order
          const captureResult = await capturePayPalOrder(orderId)

          if (captureResult.status !== 'COMPLETED') {
            return simpleErrorResponse(
              `Payment not completed. Status: ${captureResult.status}`,
            )
          }

          return successResponse({
            orderId: captureResult.orderId,
            status: captureResult.status,
            payerId: captureResult.payerId,
          })
        } catch (error) {
          return errorResponse('Failed to capture PayPal payment', error)
        }
      },
    },
  },
})
