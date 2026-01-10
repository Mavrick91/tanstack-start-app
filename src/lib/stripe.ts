import type Stripe from 'stripe'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Server-side Stripe instance - only initialize on server
let _stripe: Stripe | null = null

if (!isBrowser) {
  const StripeClass = (await import('stripe')).default
  _stripe = new StripeClass(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover',
  })
}

export const stripe = _stripe as NonNullable<typeof _stripe>

// Get publishable key for client
export const getStripePublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY || ''
}

// Create a payment intent for checkout
export const createPaymentIntent = async ({
  amount,
  currency = 'usd',
  metadata,
}: {
  amount: number // in cents
  currency?: string
  metadata?: Record<string, string>
}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata,
  })

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }
}

// Retrieve a payment intent
export const retrievePaymentIntent = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId)
}

// Verify webhook signature
export const constructWebhookEvent = (
  body: string | Buffer,
  signature: string,
  webhookSecret: string,
) => {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

// Re-export currency utilities for backwards compatibility
export { dollarsToCents, centsToDollars } from './currency'
