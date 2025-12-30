import { vi } from 'vitest'

/**
 * Options for creating a mock Stripe client.
 */
export interface MockStripeOptions {
  /** Payment intent status. Default: 'succeeded' */
  paymentStatus?: 'succeeded' | 'processing' | 'requires_payment_method' | 'requires_confirmation' | 'canceled' | 'requires_action'
  /** Payment amount in cents. Default: 3598 ($35.98) */
  amount?: number
  /** Currency. Default: 'usd' */
  currency?: string
  /** Payment intent ID. Default: 'pi_test_123' */
  paymentIntentId?: string
  /** Client secret. Default: 'pi_test_123_secret_abc' */
  clientSecret?: string
  /** Should payment intent creation fail? */
  failCreate?: boolean
  /** Should payment intent retrieval fail? */
  failRetrieve?: boolean
  /** Error message when failing */
  errorMessage?: string
}

/**
 * Creates a mock PaymentIntent object.
 */
export function createMockPaymentIntent(options: MockStripeOptions = {}) {
  return {
    id: options.paymentIntentId ?? 'pi_test_123',
    object: 'payment_intent',
    amount: options.amount ?? 3598,
    currency: options.currency ?? 'usd',
    status: options.paymentStatus ?? 'succeeded',
    client_secret: options.clientSecret ?? 'pi_test_123_secret_abc',
    created: Math.floor(Date.now() / 1000),
    metadata: {},
  }
}

/**
 * Creates a mock Stripe client for testing.
 *
 * @example
 * ```typescript
 * const stripe = createMockStripe({ paymentStatus: 'succeeded', amount: 5000 })
 *
 * // Use in tests
 * const result = await completeCheckout(checkoutId, payment, { stripeClient: stripe })
 *
 * // Verify calls
 * expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123')
 * ```
 */
export function createMockStripe(options: MockStripeOptions = {}) {
  const mockPaymentIntent = createMockPaymentIntent(options)

  return {
    paymentIntents: {
      create: options.failCreate
        ? vi.fn().mockRejectedValue(new Error(options.errorMessage ?? 'Payment creation failed'))
        : vi.fn().mockResolvedValue(mockPaymentIntent),
      retrieve: options.failRetrieve
        ? vi.fn().mockRejectedValue(new Error(options.errorMessage ?? 'Payment not found'))
        : vi.fn().mockResolvedValue(mockPaymentIntent),
      update: vi.fn().mockResolvedValue(mockPaymentIntent),
      cancel: vi.fn().mockResolvedValue({ ...mockPaymentIntent, status: 'canceled' }),
      confirm: vi.fn().mockResolvedValue({ ...mockPaymentIntent, status: 'succeeded' }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 're_test_123',
        object: 'refund',
        amount: options.amount ?? 3598,
        status: 'succeeded',
        payment_intent: options.paymentIntentId ?? 'pi_test_123',
      }),
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation((body, signature, secret) => {
        if (!signature) throw new Error('Missing stripe-signature header')
        if (!secret) throw new Error('Webhook secret not configured')
        return JSON.parse(typeof body === 'string' ? body : body.toString())
      }),
    },
  }
}

/**
 * Creates a mock Stripe webhook event.
 */
export function createMockStripeEvent(
  type: string,
  data: Record<string, unknown> = {},
) {
  return {
    id: 'evt_test_123',
    object: 'event',
    type,
    data: {
      object: {
        id: 'pi_test_123',
        object: 'payment_intent',
        amount: 3598,
        currency: 'usd',
        status: 'succeeded',
        ...data,
      },
    },
    created: Math.floor(Date.now() / 1000),
  }
}

/**
 * Pre-configured Stripe scenarios for common test cases.
 */
export const stripeScenarios = {
  /** Successful payment (default) */
  success: () => createMockStripe({ paymentStatus: 'succeeded' }),

  /** Payment requires action (3D Secure) */
  requiresAction: () => createMockStripe({ paymentStatus: 'requires_action' }),

  /** Payment processing */
  processing: () => createMockStripe({ paymentStatus: 'processing' }),

  /** Payment failed */
  failed: () => createMockStripe({ paymentStatus: 'requires_payment_method' }),

  /** Payment canceled */
  canceled: () => createMockStripe({ paymentStatus: 'canceled' }),

  /** API error on create */
  createError: () =>
    createMockStripe({
      failCreate: true,
      errorMessage: 'Your card was declined',
    }),

  /** API error on retrieve */
  retrieveError: () =>
    createMockStripe({
      failRetrieve: true,
      errorMessage: 'No such payment_intent: pi_invalid',
    }),

  /** Custom amount */
  withAmount: (cents: number) => createMockStripe({ amount: cents }),
}

/**
 * Helper to mock the stripe module in tests.
 *
 * @example
 * ```typescript
 * // In test file
 * vi.mock('../../lib/stripe', () => mockStripeModule({ paymentStatus: 'succeeded' }))
 * ```
 */
export function mockStripeModule(options: MockStripeOptions = {}) {
  const mockStripe = createMockStripe(options)
  const mockPaymentIntent = createMockPaymentIntent(options)

  return {
    stripe: mockStripe,
    createPaymentIntent: vi.fn().mockResolvedValue({
      clientSecret: mockPaymentIntent.client_secret,
      paymentIntentId: mockPaymentIntent.id,
    }),
    retrievePaymentIntent: options.failRetrieve
      ? vi.fn().mockRejectedValue(new Error(options.errorMessage ?? 'Payment not found'))
      : vi.fn().mockResolvedValue(mockPaymentIntent),
    constructWebhookEvent: mockStripe.webhooks.constructEvent,
    dollarsToCents: vi.fn((dollars: number) => Math.round(dollars * 100)),
    centsToDollars: vi.fn((cents: number) => cents / 100),
    getStripePublishableKey: vi.fn().mockReturnValue('pk_test_123'),
  }
}
