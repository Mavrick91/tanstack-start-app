import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { constructWebhookEvent } from '../../../lib/stripe'

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text()
          const signature = request.headers.get('stripe-signature')

          if (!signature) {
            return new Response('Missing stripe-signature header', {
              status: 400,
            })
          }

          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
          if (!webhookSecret) {
            console.error('STRIPE_WEBHOOK_SECRET not configured')
            return new Response('Webhook not configured', { status: 500 })
          }

          const event = constructWebhookEvent(body, signature, webhookSecret)

          switch (event.type) {
            case 'payment_intent.succeeded': {
              const paymentIntent = event.data.object
              const paymentId = paymentIntent.id

              // Update order payment status
              await db
                .update(orders)
                .set({
                  paymentStatus: 'paid',
                  paidAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(orders.paymentId, paymentId))
              break
            }

            case 'payment_intent.payment_failed': {
              const paymentIntent = event.data.object
              const paymentId = paymentIntent.id

              // Update order payment status
              await db
                .update(orders)
                .set({
                  paymentStatus: 'failed',
                  updatedAt: new Date(),
                })
                .where(eq(orders.paymentId, paymentId))
              break
            }

            default:
              console.warn(`Unhandled Stripe event type: ${event.type}`)
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Webhook error:', error)
          return new Response(
            `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 400 },
          )
        }
      },
    },
  },
})
