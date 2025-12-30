import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'
import { sendOrderConfirmationEmail } from '../../../../lib/email'
import { isQueueAvailable, queueEmail } from '../../../../lib/queue'
import { completeCheckout } from '../../../../lib/services'

import type { CheckoutCartItem } from '../../../../lib/services'

export const Route = createFileRoute('/api/checkout/$checkoutId/complete')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.clone().json()

          // Validate checkout access (requires request for auth)
          const access = await validateCheckoutAccess(checkoutId, request)
          if (!access.valid && access.error !== 'Checkout already completed') {
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

          // Complete checkout using service
          const result = await completeCheckout(checkoutId, body)

          if (!result.success) {
            return simpleErrorResponse(result.error, result.status)
          }

          // Send confirmation email (fire-and-forget)
          await sendConfirmationEmail(checkoutId, result.order)

          return successResponse({
            order: result.order,
            ...(result.idempotent && { idempotent: true }),
          })
        } catch (error) {
          return errorResponse('Failed to complete checkout', error)
        }
      },
    },
  },
})

/**
 * Sends order confirmation email via queue or direct send.
 */
async function sendConfirmationEmail(
  checkoutId: string,
  order: {
    id: string
    orderNumber: number
    email: string
    total: number
    currency: string
  },
) {
  // Fetch checkout for cart items and shipping address
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout?.shippingAddress) return

  const cartItems = checkout.cartItems as CheckoutCartItem[]

  const emailData = {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    total: order.total,
    currency: order.currency,
    items: cartItems.map((item) => ({
      title: item.title,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: checkout.shippingAddress,
  }

  const queueAvailable = await isQueueAvailable()

  if (queueAvailable) {
    queueEmail({ type: 'order_confirmation', data: emailData }).catch(
      (err: Error) =>
        console.error('Failed to queue order confirmation email:', err),
    )
  } else {
    sendOrderConfirmationEmail(emailData).catch((err: Error) =>
      console.error('Failed to send order confirmation email:', err),
    )
  }
}
