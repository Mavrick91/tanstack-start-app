import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { verifyWebhookSignature } from '../../../lib/paypal'

export const Route = createFileRoute('/api/webhooks/paypal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text()

          const webhookId = process.env.PAYPAL_WEBHOOK_ID
          if (!webhookId) {
            console.error('PAYPAL_WEBHOOK_ID not configured')
            return new Response('Webhook not configured', { status: 500 })
          }

          // Get PayPal headers
          const headers: Record<string, string> = {}
          request.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value
          })

          // Verify webhook signature
          const { verified } = await verifyWebhookSignature({
            body,
            headers,
            webhookId,
          })

          if (!verified) {
            console.error('PayPal webhook signature verification failed')
            return new Response('Invalid signature', { status: 401 })
          }

          const event = JSON.parse(body)

          switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

              if (paymentId) {
                await db
                  .update(orders)
                  .set({
                    paymentStatus: 'paid',
                    paidAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(orders.paymentId, paymentId))
              }
              break
            }

            case 'PAYMENT.CAPTURE.DENIED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

              if (paymentId) {
                await db
                  .update(orders)
                  .set({
                    paymentStatus: 'failed',
                    updatedAt: new Date(),
                  })
                  .where(eq(orders.paymentId, paymentId))
              }
              break
            }

            case 'PAYMENT.CAPTURE.REFUNDED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

              if (paymentId) {
                await db
                  .update(orders)
                  .set({
                    paymentStatus: 'refunded',
                    updatedAt: new Date(),
                  })
                  .where(eq(orders.paymentId, paymentId))
              }
              break
            }

            default:
              console.warn(`Unhandled PayPal event type: ${event.event_type}`)
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('PayPal webhook error:', error)
          return new Response(
            `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 400 },
          )
        }
      },
    },
  },
})
