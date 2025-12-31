import { describe, expect, it, vi } from 'vitest'

// Mock stripe module BEFORE importing service
vi.mock('../stripe', () => ({
  retrievePaymentIntent: vi.fn(),
  dollarsToCents: (dollars: number) => Math.round(dollars * 100),
  centsToDollars: (cents: number) => cents / 100,
}))

// Mock paypal module
vi.mock('../paypal', () => ({
  getPayPalOrder: vi.fn(),
}))

// Mock db module
vi.mock('../../db', () => ({
  db: {},
}))

// Mock schema
vi.mock('../../db/schema', () => ({
  checkouts: { _: { name: 'checkouts' } },
  orders: { _: { name: 'orders' } },
  orderItems: { _: { name: 'order_items' } },
}))

import { completeCheckout, CheckoutError } from './checkout.service'
import { createCheckout } from '../../tests/utils/factories'

import type { CheckoutServiceDeps } from './checkout.service'

/**
 * Creates a mock database for checkout service tests.
 */
const createMockDb = (
  options: {
    checkout?: ReturnType<typeof createCheckout> | null
    insertError?: Error
    existingOrder?: {
      id: string
      orderNumber: number
      email: string
      total: string
      currency: string
      status: string
      paymentStatus: string
    } | null
  } = {},
): ReturnType<typeof vi.fn> => {
  const mockTransaction = vi.fn().mockImplementation(async (callback) => {
    if (options.insertError) {
      throw options.insertError
    }
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'order-new',
              orderNumber: 1001,
              email: options.checkout?.email ?? 'test@example.com',
              total: options.checkout?.total?.toString() ?? '35.98',
              currency: 'USD',
              status: 'pending',
              paymentStatus: 'paid',
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }
    return callback(tx)
  })

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table) => {
        const tableName = table?._.name ?? 'unknown'
        if (tableName === 'checkouts') {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue(options.checkout ? [options.checkout] : []),
            }),
          }
        }
        if (tableName === 'orders' && options.existingOrder) {
          return {
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([options.existingOrder]),
            }),
          }
        }
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }
      }),
    }),
    transaction: mockTransaction,
  }
  return mockDb as unknown as ReturnType<typeof vi.fn>
}

/**
 * Creates mock Stripe functions.
 */
const createMockStripe = (
  options: {
    status?: string
    amount?: number
    error?: Error
  } = {},
): ReturnType<typeof vi.fn> => {
  if (options.error) {
    return vi.fn().mockRejectedValue(options.error)
  }
  return vi.fn().mockResolvedValue({
    id: 'pi_test_123',
    status: options.status ?? 'succeeded',
    amount: options.amount ?? 3598,
  })
}

/**
 * Creates mock PayPal functions.
 */
const createMockPayPal = (
  options: {
    status?: string
    capturedAmount?: string
    error?: Error
  } = {},
): ReturnType<typeof vi.fn> => {
  if (options.error) {
    return vi.fn().mockRejectedValue(options.error)
  }
  return vi.fn().mockResolvedValue({
    id: 'PAYPAL-ORDER-123',
    status: options.status ?? 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            {
              amount: {
                value: options.capturedAmount ?? '35.98',
              },
            },
          ],
        },
      },
    ],
  })
}

describe('Checkout Service', () => {
  describe('completeCheckout', () => {
    describe('payment input validation', () => {
      it('returns error when payment provider is missing', async () => {
        const deps = {
          db: createMockDb(),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment provider and payment ID are required',
          status: 400,
        })
      })

      it('returns error when payment ID is missing', async () => {
        const deps = {
          db: createMockDb(),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment provider and payment ID are required',
          status: 400,
        })
      })

      it('returns error for invalid payment provider', async () => {
        const deps = {
          db: createMockDb(),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'bitcoin', paymentId: 'abc123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Invalid payment provider',
          status: 400,
        })
      })
    })

    describe('checkout validation', () => {
      it('returns error when checkout not found', async () => {
        const deps = {
          db: createMockDb({ checkout: null }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Checkout not found',
          status: 404,
        })
      })

      it('returns error when checkout is already completed', async () => {
        const checkout = createCheckout({ completedAt: new Date() })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Checkout has already been completed',
          status: 410,
        })
      })

      it('returns error when cart is empty', async () => {
        const checkout = createCheckout({ cartItems: [] })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Cart is empty',
          status: 400,
        })
      })

      it('returns error when email is missing', async () => {
        const checkout = createCheckout({ email: undefined })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Customer email is required',
          status: 400,
        })
      })

      it('returns error when shipping address is missing', async () => {
        const checkout = createCheckout({ shippingAddress: undefined })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Shipping address is required',
          status: 400,
        })
      })

      it('returns error when shipping method is missing', async () => {
        const checkout = createCheckout({ shippingRateId: undefined })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Shipping method is required',
          status: 400,
        })
      })
    })

    describe('Stripe payment verification', () => {
      it('creates order when Stripe payment succeeded', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const mockStripe = createMockStripe({
          status: 'succeeded',
          amount: 3598,
        })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: mockStripe,
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result.success).toBe(true)
        expect(mockStripe).toHaveBeenCalledWith('pi_123')
        if (result.success) {
          expect(result.order!.paymentStatus).toBe('paid')
        }
      })

      it('returns error when Stripe payment not succeeded', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe({
            status: 'processing',
            amount: 3598,
          }),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment not completed. Status: processing',
          status: 400,
        })
      })

      it('returns error when Stripe payment amount does not match', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe({
            status: 'succeeded',
            amount: 1000,
          }),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment amount mismatch',
          status: 400,
        })
      })

      it('returns error when Stripe API fails', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe({
            error: new Error('Stripe API error'),
          }),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Failed to verify payment',
          status: 500,
        })
      })
    })

    describe('PayPal payment verification', () => {
      it('creates order when PayPal payment completed', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const mockPayPal = createMockPayPal({
          status: 'COMPLETED',
          capturedAmount: '35.98',
        })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: mockPayPal,
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'paypal', paymentId: 'PAYPAL-ORDER-123' },
          deps,
        )

        expect(result.success).toBe(true)
        expect(mockPayPal).toHaveBeenCalledWith('PAYPAL-ORDER-123')
      })

      it('returns error when PayPal payment not completed', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal({ status: 'APPROVED' }),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'paypal', paymentId: 'PAYPAL-ORDER-123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment not completed. Status: APPROVED',
          status: 400,
        })
      })

      it('returns error when PayPal amount does not match', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe(),
          getPayPalOrder: createMockPayPal({
            status: 'COMPLETED',
            capturedAmount: '10.00',
          }),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'paypal', paymentId: 'PAYPAL-ORDER-123' },
          deps,
        )

        expect(result).toEqual({
          success: false,
          error: 'Payment amount mismatch',
          status: 400,
        })
      })
    })

    describe('order creation', () => {
      it('returns order with correct fields on success', async () => {
        const checkout = createCheckout({
          total: 35.98,
          email: 'customer@example.com',
        })
        const deps = {
          db: createMockDb({ checkout }),
          retrievePaymentIntent: createMockStripe({
            status: 'succeeded',
            amount: 3598,
          }),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.order).toMatchObject({
            id: expect.any(String),
            orderNumber: expect.any(Number),
            email: expect.any(String),
            status: 'pending',
            paymentStatus: 'paid',
          })
        }
      })

      it('handles idempotent duplicate order', async () => {
        const checkout = createCheckout({ total: 35.98 })
        const duplicateError = Object.assign(new Error('Duplicate'), {
          code: '23505',
        })
        const existingOrder = {
          id: 'existing-order',
          orderNumber: 1000,
          email: 'test@example.com',
          total: '35.98',
          currency: 'USD',
          status: 'pending',
          paymentStatus: 'paid',
        }

        const deps = {
          db: createMockDb({
            checkout,
            insertError: duplicateError,
            existingOrder,
          }),
          retrievePaymentIntent: createMockStripe({
            status: 'succeeded',
            amount: 3598,
          }),
          getPayPalOrder: createMockPayPal(),
        } as unknown as CheckoutServiceDeps

        const result = await completeCheckout(
          'checkout-123',
          { paymentProvider: 'stripe', paymentId: 'pi_123' },
          deps,
        )

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.idempotent).toBe(true)
          expect(result.order!.id).toBe('existing-order')
        }
      })
    })
  })

  describe('CheckoutError', () => {
    it('has correct name and status', () => {
      const error = new CheckoutError('Test error', 400)

      expect(error.name).toBe('CheckoutError')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
    })

    it('defaults status to 400', () => {
      const error = new CheckoutError('Test error')

      expect(error.status).toBe(400)
    })
  })
})
