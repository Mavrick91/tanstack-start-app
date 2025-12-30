import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../db'
import { orders } from '../../../db/schema'
import { withSecurityHeaders } from '../../../lib/api'
import { verifyWebhookSignature } from '../../../lib/paypal'
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from '../../../lib/rate-limit'
import { isWebhookProcessed, recordWebhookEvent } from '../../../lib/webhooks'
import { recordStatusChange } from '../../../server/orders'

export const Route = createFileRoute('/api/webhooks/paypal')({
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

          const webhookId = process.env.PAYPAL_WEBHOOK_ID
          if (!webhookId) {
            console.error('PAYPAL_WEBHOOK_ID not configured')
            return withSecurityHeaders(
              new Response('Webhook not configured', { status: 500 }),
            )
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
            return withSecurityHeaders(
              new Response('Invalid signature', { status: 401 }),
            )
          }

          const event = JSON.parse(body)

          // Check for idempotency - skip if already processed
          if (await isWebhookProcessed(event.id, 'paypal')) {
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

          switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

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
                  const previousStatus = currentOrder.paymentStatus
                  orderId = currentOrder.id

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
                      changedBy: 'paypal-webhook',
                      changedAt: new Date(),
                      reason: `PayPal PAYMENT.CAPTURE.COMPLETED (${capture.id})`,
                    })
                  }
                }
              }
              break
            }

            case 'PAYMENT.CAPTURE.DENIED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

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
                  const previousStatus = currentOrder.paymentStatus
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
                      changedBy: 'paypal-webhook',
                      changedAt: new Date(),
                      reason: `PayPal PAYMENT.CAPTURE.DENIED (${capture.id})`,
                    })
                  }
                }
              }
              break
            }

            case 'PAYMENT.CAPTURE.REFUNDED': {
              const capture = event.resource
              const paymentId =
                capture.supplementary_data?.related_ids?.order_id

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
                  const previousStatus = currentOrder.paymentStatus
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
                      changedBy: 'paypal-webhook',
                      changedAt: new Date(),
                      reason: `PayPal PAYMENT.CAPTURE.REFUNDED (${capture.id})`,
                    })
                  }
                }
              }
              break
            }

            default:
              console.warn(`Unhandled PayPal event type: ${event.event_type}`)
          }

          // Record the processed event for idempotency
          await recordWebhookEvent({
            id: event.id,
            provider: 'paypal',
            eventType: event.event_type,
            orderId,
            payload: event.resource,
          })

          return withSecurityHeaders(
            new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        } catch (error) {
          console.error('PayPal webhook error:', error)
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'

          // Signature/parsing/verification errors are client errors (400) - don't retry
          const isClientError = [
            'signature',
            'parse',
            'json',
            'invalid',
            'malformed',
            'verification',
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
