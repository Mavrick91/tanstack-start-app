import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
})

// Get publishable key for client
export const getStripePublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY || ''
}

// Create a payment intent for checkout
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  metadata,
}: {
  amount: number // in cents
  currency?: string
  metadata?: Record<string, string>
}) {
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
export async function retrievePaymentIntent(paymentIntentId: string) {
  return await stripe.paymentIntents.retrieve(paymentIntentId)
}

// Verify webhook signature
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
  webhookSecret: string,
) {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

// Convert dollars to cents
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Convert cents to dollars
export function centsToDollars(cents: number): number {
  return cents / 100
}
