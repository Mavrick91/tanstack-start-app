import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import { webhookEvents } from '../db/schema'

/**
 * Check if a webhook event has already been processed
 */
export const isWebhookProcessed = async (
  eventId: string,
  provider: 'stripe' | 'paypal',
) => {
  const existing = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(
      and(eq(webhookEvents.id, eventId), eq(webhookEvents.provider, provider)),
    )
    .limit(1)

  return existing.length > 0
}

/**
 * Record a webhook event after successful processing
 */
export const recordWebhookEvent = async (event: {
  id: string
  provider: 'stripe' | 'paypal'
  eventType: string
  orderId?: string
  payload?: unknown
}) => {
  await db.insert(webhookEvents).values({
    id: event.id,
    provider: event.provider,
    eventType: event.eventType,
    orderId: event.orderId,
    payload: event.payload,
  })
}
