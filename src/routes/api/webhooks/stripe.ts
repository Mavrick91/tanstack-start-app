import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { withSecurityHeaders } from '../../../lib/api'
import { logError, logWarning } from '../../../lib/logger'
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from '../../../lib/rate-limit'
import { constructWebhookEvent } from '../../../lib/stripe'
import { isWebhookProcessed, recordWebhookEvent } from '../../../lib/webhooks'
import { recordStatusChange } from '../../../server/orders'

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = getRateLimitKey(request)
          const rateLimit = await checkRateLimit('webhook', key)
          if (!rateLimit.allowed) {
            return rateLimitResponse(rateLimit.retryAfter || 60)
          }

          const body = await request.text()
          const signature = request.headers.get('stripe-signature')

          if (!signature) {
            return withSecurityHeaders(
              new Response('Missing stripe-signature header', {
                status: 400,
              }),
            )
          }

          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
          if (!webhookSecret) {
            logError(
              'STRIPE_WEBHOOK_SECRET not configured',
              new Error('Missing webhook secret'),
            )
            return withSecurityHeaders(
              new Response('Webhook not configured', { status: 500 }),
            )
          }

          const event = constructWebhookEvent(body, signature, webhookSecret)

          // Check for idempotency - skip if already processed
          if (await isWebhookProcessed(event.id, 'stripe')) {
            return withSecurityHeaders(
              new Response(
                JSON.stringify({ received: true, deduplicated: true }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                },
              ),
            )
          }

          let orderId: string | undefined
          let previousStatus: string | undefined

          switch (event.type) {
            case 'payment_intent.succeeded': {
              const paymentIntent = event.data.object
              const paymentId = paymentIntent.id

              // Get current order to capture previous status
              const [currentOrder] = await db
                .select({ id: orders.id, paymentStatus: orders.paymentStatus })
                .from(orders)
                .where(eq(orders.paymentId, paymentId))
                .limit(1)

              if (currentOrder) {
                previousStatus = currentOrder.paymentStatus
                orderId = currentOrder.id

                // Update order payment status
                await db
                  .update(orders)
                  .set({
                    paymentStatus: 'paid',
                    paidAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(orders.id, currentOrder.id))

                // Record status change in audit trail
                if (previousStatus !== 'paid') {
                  await recordStatusChange({
                    orderId: currentOrder.id,
                    field: 'paymentStatus',
                    previousValue: previousStatus,
                    newValue: 'paid',
                    changedBy: 'stripe-webhook',
                    changedAt: new Date(),
                    reason: `Stripe payment_intent.succeeded (${paymentIntent.id})`,
                  })
                }
              }
              break
            }

            case 'payment_intent.payment_failed': {
              const paymentIntent = event.data.object
              const paymentId = paymentIntent.id

              // Get current order to capture previous status
              const [currentOrder] = await db
                .select({ id: orders.id, paymentStatus: orders.paymentStatus })
                .from(orders)
                .where(eq(orders.paymentId, paymentId))
                .limit(1)

              if (currentOrder) {
                previousStatus = currentOrder.paymentStatus
                orderId = currentOrder.id

                await db
                  .update(orders)
                  .set({
                    paymentStatus: 'failed',
                    updatedAt: new Date(),
                  })
                  .where(eq(orders.id, currentOrder.id))

                // Record status change in audit trail
                if (previousStatus !== 'failed') {
                  await recordStatusChange({
                    orderId: currentOrder.id,
                    field: 'paymentStatus',
                    previousValue: previousStatus,
                    newValue: 'failed',
                    changedBy: 'stripe-webhook',
                    changedAt: new Date(),
                    reason: `Stripe payment_intent.payment_failed (${paymentIntent.id})`,
                  })
                }
              }
              break
            }

            case 'charge.refunded': {
              const charge = event.data.object
              const paymentId = charge.payment_intent as string

              if (paymentId) {
                // Get current order to capture previous status
                const [currentOrder] = await db
                  .select({
                    id: orders.id,
                    paymentStatus: orders.paymentStatus,
                  })
                  .from(orders)
                  .where(eq(orders.paymentId, paymentId))
                  .limit(1)

                if (currentOrder) {
                  previousStatus = currentOrder.paymentStatus
                  orderId = currentOrder.id

                  await db
                    .update(orders)
                    .set({
                      paymentStatus: 'refunded',
                      updatedAt: new Date(),
                    })
                    .where(eq(orders.id, currentOrder.id))

                  // Record status change in audit trail
                  if (previousStatus !== 'refunded') {
                    await recordStatusChange({
                      orderId: currentOrder.id,
                      field: 'paymentStatus',
                      previousValue: previousStatus,
                      newValue: 'refunded',
                      changedBy: 'stripe-webhook',
                      changedAt: new Date(),
                      reason: `Stripe charge.refunded (${charge.id})`,
                    })
                  }
                }
              }
              break
            }

            case 'charge.dispute.created': {
              const dispute = event.data.object
              const paymentId = dispute.payment_intent as string

              if (paymentId) {
                // Get current order
                const [currentOrder] = await db
                  .select({ id: orders.id, status: orders.status })
                  .from(orders)
                  .where(eq(orders.paymentId, paymentId))
                  .limit(1)

                if (currentOrder) {
                  previousStatus = currentOrder.status
                  orderId = currentOrder.id

                  // Put order on hold during dispute
                  await db
                    .update(orders)
                    .set({
                      status: 'pending',
                      updatedAt: new Date(),
                    })
                    .where(eq(orders.id, currentOrder.id))

                  // Record status change in audit trail
                  await recordStatusChange({
                    orderId: currentOrder.id,
                    field: 'status',
                    previousValue: previousStatus,
                    newValue: 'pending',
                    changedBy: 'stripe-webhook',
                    changedAt: new Date(),
                    reason: `Dispute opened: ${dispute.reason} (${dispute.id})`,
                  })
                }
              }
              break
            }

            case 'charge.dispute.closed': {
              const dispute = event.data.object
              const paymentId = dispute.payment_intent as string

              if (paymentId) {
                // Get current order
                const [currentOrder] = await db
                  .select({
                    id: orders.id,
                    status: orders.status,
                    paymentStatus: orders.paymentStatus,
                  })
                  .from(orders)
                  .where(eq(orders.paymentId, paymentId))
                  .limit(1)

                if (currentOrder) {
                  orderId = currentOrder.id

                  // Record the dispute resolution
                  await recordStatusChange({
                    orderId: currentOrder.id,
                    field: 'status',
                    previousValue: currentOrder.status,
                    newValue: currentOrder.status, // Status may not change
                    changedBy: 'stripe-webhook',
                    changedAt: new Date(),
                    reason: `Dispute closed: ${dispute.status} (${dispute.id})`,
                  })

                  // If dispute was lost, mark as refunded
                  if (dispute.status === 'lost') {
                    await db
                      .update(orders)
                      .set({
                        paymentStatus: 'refunded',
                        status: 'cancelled',
                        updatedAt: new Date(),
                      })
                      .where(eq(orders.id, currentOrder.id))

                    await recordStatusChange({
                      orderId: currentOrder.id,
                      field: 'paymentStatus',
                      previousValue: currentOrder.paymentStatus,
                      newValue: 'refunded',
                      changedBy: 'stripe-webhook',
                      changedAt: new Date(),
                      reason: `Dispute lost - funds returned to customer (${dispute.id})`,
                    })
                  }
                }
              }
              break
            }

            default:
              logWarning(`Unhandled Stripe event type: ${event.type}`, {
                eventType: event.type,
              })
          }

          // Record the processed event for idempotency
          await recordWebhookEvent({
            id: event.id,
            provider: 'stripe',
            eventType: event.type,
            orderId,
            payload: event.data.object,
          })

          return withSecurityHeaders(
            new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        } catch (error) {
          logError('Stripe webhook error', error)
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'

          // Signature/parsing errors are client errors (400) - don't retry
          const isClientError = [
            'signature',
            'parse',
            'json',
            'invalid',
            'malformed',
          ].some((pattern) => errorMessage.toLowerCase().includes(pattern))

          if (isClientError) {
            return withSecurityHeaders(
              new Response(`Webhook Error: ${errorMessage}`, {
                status: 400,
              }),
            )
          }

          // Database/network errors are transient (500) - providers will retry
          return withSecurityHeaders(
            new Response(`Webhook Error: ${errorMessage}`, { status: 500 }),
          )
        }
      },
    },
  },
})
