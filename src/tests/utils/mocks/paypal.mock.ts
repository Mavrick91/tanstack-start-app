import { vi } from 'vitest'

/**
 * Options for creating a mock PayPal client.
 */
export interface MockPayPalOptions {
  /** Order status. Default: 'COMPLETED' */
  orderStatus?:
    | 'CREATED'
    | 'SAVED'
    | 'APPROVED'
    | 'VOIDED'
    | 'COMPLETED'
    | 'PAYER_ACTION_REQUIRED'
  /** Capture status. Default: 'COMPLETED' */
  captureStatus?:
    | 'COMPLETED'
    | 'DECLINED'
    | 'PARTIALLY_REFUNDED'
    | 'PENDING'
    | 'REFUNDED'
    | 'FAILED'
  /** Amount in dollars. Default: '35.98' */
  amount?: string
  /** Currency. Default: 'USD' */
  currency?: string
  /** Order ID. Default: 'PAYPAL-ORDER-123' */
  orderId?: string
  /** Capture ID. Default: 'CAPTURE-123' */
  captureId?: string
  /** Should order creation fail? */
  failCreate?: boolean
  /** Should order retrieval fail? */
  failRetrieve?: boolean
  /** Should capture fail? */
  failCapture?: boolean
  /** Should webhook verification fail? */
  failWebhook?: boolean
  /** Error message when failing */
  errorMessage?: string
}

/**
 * Creates a mock PayPal order object.
 */
export function createMockPayPalOrder(options: MockPayPalOptions = {}) {
  const amount = options.amount ?? '35.98'
  const currency = options.currency ?? 'USD'
  const orderId = options.orderId ?? 'PAYPAL-ORDER-123'

  return {
    id: orderId,
    status: options.orderStatus ?? 'COMPLETED',
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: 'default',
        amount: {
          currency_code: currency,
          value: amount,
        },
        payments: {
          captures: [
            {
              id: options.captureId ?? 'CAPTURE-123',
              status: options.captureStatus ?? 'COMPLETED',
              amount: {
                currency_code: currency,
                value: amount,
              },
            },
          ],
        },
      },
    ],
    payer: {
      email_address: 'buyer@example.com',
      payer_id: 'PAYER-123',
      name: {
        given_name: 'John',
        surname: 'Doe',
      },
    },
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  }
}

/**
 * Creates a mock PayPal capture result.
 */
export function createMockPayPalCapture(options: MockPayPalOptions = {}) {
  const amount = options.amount ?? '35.98'
  const currency = options.currency ?? 'USD'

  return {
    id: options.captureId ?? 'CAPTURE-123',
    status: options.captureStatus ?? 'COMPLETED',
    amount: {
      currency_code: currency,
      value: amount,
    },
    final_capture: true,
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  }
}

/**
 * Creates a mock PayPal client for testing.
 *
 * @example
 * ```typescript
 * const paypal = createMockPayPal({ orderStatus: 'COMPLETED', amount: '50.00' })
 *
 * // Use in tests
 * const result = await completeCheckout(checkoutId, payment, { paypalClient: paypal })
 *
 * // Verify calls
 * expect(paypal.getOrder).toHaveBeenCalledWith('PAYPAL-ORDER-123')
 * ```
 */
export function createMockPayPal(options: MockPayPalOptions = {}) {
  const mockOrder = createMockPayPalOrder(options)
  const mockCapture = createMockPayPalCapture(options)

  return {
    createOrder: options.failCreate
      ? vi
          .fn()
          .mockRejectedValue(
            new Error(options.errorMessage ?? 'Failed to create PayPal order'),
          )
      : vi.fn().mockResolvedValue(mockOrder),
    getOrder: options.failRetrieve
      ? vi
          .fn()
          .mockRejectedValue(
            new Error(options.errorMessage ?? 'PayPal order not found'),
          )
      : vi.fn().mockResolvedValue(mockOrder),
    captureOrder: options.failCapture
      ? vi
          .fn()
          .mockRejectedValue(
            new Error(options.errorMessage ?? 'Failed to capture payment'),
          )
      : vi.fn().mockResolvedValue({ ...mockOrder, status: 'COMPLETED' }),
    capturePayment: options.failCapture
      ? vi
          .fn()
          .mockRejectedValue(
            new Error(options.errorMessage ?? 'Failed to capture payment'),
          )
      : vi.fn().mockResolvedValue(mockCapture),
    verifyWebhookSignature: options.failWebhook
      ? vi.fn().mockResolvedValue({ verified: false })
      : vi.fn().mockResolvedValue({ verified: true }),
  }
}

/**
 * Creates a mock PayPal webhook event.
 */
export function createMockPayPalWebhookEvent(
  eventType: string,
  resource: Record<string, unknown> = {},
) {
  return {
    id: 'WH-123',
    event_type: eventType,
    resource_type: 'capture',
    resource: {
      id: 'CAPTURE-123',
      status: 'COMPLETED',
      amount: {
        currency_code: 'USD',
        value: '35.98',
      },
      supplementary_data: {
        related_ids: {
          order_id: 'PAYPAL-ORDER-123',
        },
      },
      ...resource,
    },
    create_time: new Date().toISOString(),
  }
}

/**
 * Pre-configured PayPal scenarios for common test cases.
 */
export const paypalScenarios = {
  /** Successful payment (default) */
  success: () =>
    createMockPayPal({ orderStatus: 'COMPLETED', captureStatus: 'COMPLETED' }),

  /** Payment approved but not captured */
  approved: () => createMockPayPal({ orderStatus: 'APPROVED' }),

  /** Payment pending */
  pending: () =>
    createMockPayPal({ orderStatus: 'COMPLETED', captureStatus: 'PENDING' }),

  /** Payment declined */
  declined: () => createMockPayPal({ captureStatus: 'DECLINED' }),

  /** Payment failed */
  failed: () => createMockPayPal({ captureStatus: 'FAILED' }),

  /** Payment refunded */
  refunded: () => createMockPayPal({ captureStatus: 'REFUNDED' }),

  /** API error on create */
  createError: () =>
    createMockPayPal({
      failCreate: true,
      errorMessage: 'PAYEE_ACCOUNT_INVALID',
    }),

  /** API error on retrieve */
  retrieveError: () =>
    createMockPayPal({
      failRetrieve: true,
      errorMessage: 'RESOURCE_NOT_FOUND',
    }),

  /** Capture error */
  captureError: () =>
    createMockPayPal({
      failCapture: true,
      errorMessage: 'INSTRUMENT_DECLINED',
    }),

  /** Invalid webhook signature */
  invalidWebhook: () => createMockPayPal({ failWebhook: true }),

  /** Custom amount */
  withAmount: (dollars: string) => createMockPayPal({ amount: dollars }),
}

/**
 * Helper to mock the paypal module in tests.
 *
 * @example
 * ```typescript
 * // In test file
 * vi.mock('../../lib/paypal', () => mockPayPalModule({ orderStatus: 'COMPLETED' }))
 * ```
 */
export function mockPayPalModule(options: MockPayPalOptions = {}) {
  const mockPayPal = createMockPayPal(options)
  const mockOrder = createMockPayPalOrder(options)

  return {
    createPayPalOrder: mockPayPal.createOrder,
    getPayPalOrder: options.failRetrieve
      ? vi
          .fn()
          .mockRejectedValue(
            new Error(options.errorMessage ?? 'PayPal order not found'),
          )
      : vi.fn().mockResolvedValue(mockOrder),
    capturePayPalPayment: mockPayPal.capturePayment,
    verifyWebhookSignature: mockPayPal.verifyWebhookSignature,
    getPayPalAccessToken: vi.fn().mockResolvedValue('ACCESS-TOKEN-123'),
  }
}
