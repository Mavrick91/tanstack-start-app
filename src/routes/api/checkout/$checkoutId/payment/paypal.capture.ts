import { createFileRoute } from '@tanstack/react-router'

import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../../lib/api'
import { validateCheckoutAccess } from '../../../../../lib/checkout-auth'
import { capturePayPalOrder } from '../../../../../lib/paypal'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/payment/paypal/capture',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { checkoutId } = params
          const body = await request.clone().json()
          const { orderId } = body

          if (!orderId) {
            return simpleErrorResponse('PayPal order ID is required')
          }

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
