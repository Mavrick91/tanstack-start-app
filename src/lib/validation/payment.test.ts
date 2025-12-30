import { describe, expect, it } from 'vitest'

import {
  validatePaymentInput,
  validateStripePayment,
  validatePayPalPayment,
  isValidPaymentProvider,
  dollarsToCents,
  centsToDollars,
} from './payment'

describe('Payment Validation', () => {
  describe('validatePaymentInput', () => {
    it('returns valid for complete input', () => {
      const result = validatePaymentInput({
        paymentProvider: 'stripe',
        paymentId: 'pi_test_123',
      })

      expect(result.valid).toBe(true)
      expect(result).toEqual({
        valid: true,
        data: {
          paymentProvider: 'stripe',
          paymentId: 'pi_test_123',
        },
      })
    })

    it('accepts paypal as provider', () => {
      const result = validatePaymentInput({
        paymentProvider: 'paypal',
        paymentId: 'PAYPAL-ORDER-123',
      })

      expect(result.valid).toBe(true)
      expect(result).toEqual({
        valid: true,
        data: {
          paymentProvider: 'paypal',
          paymentId: 'PAYPAL-ORDER-123',
        },
      })
    })

    it('returns error when payment provider is missing', () => {
      const result = validatePaymentInput({
        paymentProvider: null,
        paymentId: 'pi_test_123',
      })

      expect(result).toEqual({
        valid: false,
        error: 'Payment provider and payment ID are required',
        status: 400,
      })
    })

    it('returns error when payment ID is missing', () => {
      const result = validatePaymentInput({
        paymentProvider: 'stripe',
        paymentId: null,
      })

      expect(result).toEqual({
        valid: false,
        error: 'Payment provider and payment ID are required',
        status: 400,
      })
    })

    it('returns error when both are missing', () => {
      const result = validatePaymentInput({})

      expect(result).toEqual({
        valid: false,
        error: 'Payment provider and payment ID are required',
        status: 400,
      })
    })

    it('returns error for invalid payment provider', () => {
      const result = validatePaymentInput({
        paymentProvider: 'bitcoin',
        paymentId: 'abc123',
      })

      expect(result).toEqual({
        valid: false,
        error: 'Invalid payment provider',
        status: 400,
      })
    })

    it('returns error for empty string payment provider', () => {
      const result = validatePaymentInput({
        paymentProvider: '',
        paymentId: 'pi_test_123',
      })

      expect(result).toEqual({
        valid: false,
        error: 'Payment provider and payment ID are required',
        status: 400,
      })
    })

    it('returns error for empty string payment ID', () => {
      const result = validatePaymentInput({
        paymentProvider: 'stripe',
        paymentId: '',
      })

      expect(result).toEqual({
        valid: false,
        error: 'Payment provider and payment ID are required',
        status: 400,
      })
    })
  })

  describe('isValidPaymentProvider', () => {
    it('returns true for stripe', () => {
      expect(isValidPaymentProvider('stripe')).toBe(true)
    })

    it('returns true for paypal', () => {
      expect(isValidPaymentProvider('paypal')).toBe(true)
    })

    it('returns false for unknown providers', () => {
      expect(isValidPaymentProvider('bitcoin')).toBe(false)
      expect(isValidPaymentProvider('cash')).toBe(false)
      expect(isValidPaymentProvider('')).toBe(false)
      expect(isValidPaymentProvider('STRIPE')).toBe(false) // Case sensitive
    })
  })

  describe('validateStripePayment', () => {
    it('returns valid for succeeded payment with matching amount', () => {
      const result = validateStripePayment(
        { status: 'succeeded', amount: 3598 },
        3598,
      )

      expect(result).toEqual({ valid: true })
    })

    it('returns error when payment status is not succeeded', () => {
      const result = validateStripePayment(
        { status: 'processing', amount: 3598 },
        3598,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: processing',
        status: 400,
      })
    })

    it('returns error for requires_payment_method status', () => {
      const result = validateStripePayment(
        { status: 'requires_payment_method', amount: 3598 },
        3598,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: requires_payment_method',
        status: 400,
      })
    })

    it('returns error for canceled status', () => {
      const result = validateStripePayment(
        { status: 'canceled', amount: 3598 },
        3598,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: canceled',
        status: 400,
      })
    })

    it('returns error when amount does not match', () => {
      const result = validateStripePayment(
        { status: 'succeeded', amount: 1000 },
        3598,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment amount mismatch',
        status: 400,
      })
    })

    it('checks status before amount', () => {
      const result = validateStripePayment(
        { status: 'processing', amount: 1000 }, // Both wrong
        3598,
      )

      expect((result as { error: string }).error).toContain('not completed')
    })
  })

  describe('validatePayPalPayment', () => {
    it('returns valid for completed payment with matching amount', () => {
      const result = validatePayPalPayment(
        { status: 'COMPLETED', capturedAmount: '35.98' },
        35.98,
      )

      expect(result).toEqual({ valid: true })
    })

    it('returns valid when captured amount is not provided', () => {
      // PayPal might not always include amount in verification
      const result = validatePayPalPayment({ status: 'COMPLETED' }, 35.98)

      expect(result).toEqual({ valid: true })
    })

    it('returns error when payment status is not COMPLETED', () => {
      const result = validatePayPalPayment(
        { status: 'APPROVED', capturedAmount: '35.98' },
        35.98,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: APPROVED',
        status: 400,
      })
    })

    it('returns error for PENDING status', () => {
      const result = validatePayPalPayment(
        { status: 'PENDING', capturedAmount: '35.98' },
        35.98,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: PENDING',
        status: 400,
      })
    })

    it('returns error for VOIDED status', () => {
      const result = validatePayPalPayment(
        { status: 'VOIDED', capturedAmount: '35.98' },
        35.98,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment not completed. Status: VOIDED',
        status: 400,
      })
    })

    it('returns error when amount does not match', () => {
      const result = validatePayPalPayment(
        { status: 'COMPLETED', capturedAmount: '10.00' },
        35.98,
      )

      expect(result).toEqual({
        valid: false,
        error: 'Payment amount mismatch',
        status: 400,
      })
    })

    it('handles string amount comparison correctly', () => {
      // '35.98' should equal 35.98
      const result = validatePayPalPayment(
        { status: 'COMPLETED', capturedAmount: '35.98' },
        35.98,
      )

      expect(result).toEqual({ valid: true })
    })
  })

  describe('dollarsToCents', () => {
    it('converts whole dollars', () => {
      expect(dollarsToCents(10)).toBe(1000)
      expect(dollarsToCents(1)).toBe(100)
      expect(dollarsToCents(100)).toBe(10000)
    })

    it('converts dollars with cents', () => {
      expect(dollarsToCents(10.5)).toBe(1050)
      expect(dollarsToCents(35.98)).toBe(3598)
      expect(dollarsToCents(0.99)).toBe(99)
    })

    it('handles zero', () => {
      expect(dollarsToCents(0)).toBe(0)
    })

    it('rounds to avoid floating point errors', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(dollarsToCents(0.1 + 0.2)).toBe(30)
    })
  })

  describe('centsToDollars', () => {
    it('converts cents to dollars', () => {
      expect(centsToDollars(1000)).toBe(10)
      expect(centsToDollars(100)).toBe(1)
      expect(centsToDollars(3598)).toBe(35.98)
    })

    it('handles zero', () => {
      expect(centsToDollars(0)).toBe(0)
    })

    it('handles odd cents', () => {
      expect(centsToDollars(99)).toBe(0.99)
      expect(centsToDollars(1)).toBe(0.01)
    })
  })
})
