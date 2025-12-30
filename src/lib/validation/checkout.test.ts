import { describe, expect, it } from 'vitest'

import {
  validateCheckoutForPayment,
  validateCheckoutState,
  validateCartNotEmpty,
  validateCheckoutComplete,
} from './checkout'
import { createAddress, createCartItem } from '../../tests/utils/factories'

import type { CheckoutForValidation } from './checkout'

/**
 * Helper to create a valid checkout for validation tests.
 * Uses minimal structure needed for validation.
 */
function createCheckoutForValidation(
  overrides: Partial<CheckoutForValidation> = {},
): CheckoutForValidation {
  return {
    id: 'checkout-123',
    email: 'test@example.com',
    shippingAddress: createAddress(),
    shippingRateId: 'standard',
    cartItems: [createCartItem()],
    ...overrides,
  }
}

describe('Checkout Validation', () => {
  describe('validateCheckoutForPayment', () => {
    it('returns valid for complete checkout', () => {
      const checkout = createCheckoutForValidation()

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({ valid: true })
    })

    it('returns error when email is missing', () => {
      const checkout = createCheckoutForValidation({ email: null })

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Customer email is required',
        status: 400,
      })
    })

    it('returns error when email is undefined', () => {
      const checkout = createCheckoutForValidation({ email: undefined })

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Customer email is required',
        status: 400,
      })
    })

    it('returns error when email is empty string', () => {
      const checkout = createCheckoutForValidation({ email: '' })

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Customer email is required',
        status: 400,
      })
    })

    it('returns error when shipping address is missing', () => {
      const checkout = createCheckoutForValidation({ shippingAddress: null })

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Shipping address is required',
        status: 400,
      })
    })

    it('returns error when shipping rate is missing', () => {
      const checkout = createCheckoutForValidation({ shippingRateId: null })

      const result = validateCheckoutForPayment(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Shipping method is required',
        status: 400,
      })
    })

    it('checks email before shipping address', () => {
      const checkout = createCheckoutForValidation({
        email: null,
        shippingAddress: null,
      })

      const result = validateCheckoutForPayment(checkout)

      expect(result.valid).toBe(false)
      expect((result as { error: string }).error).toBe(
        'Customer email is required',
      )
    })
  })

  describe('validateCheckoutState', () => {
    it('returns valid for active checkout', () => {
      const checkout = createCheckoutForValidation()

      const result = validateCheckoutState(checkout)

      expect(result).toEqual({ valid: true })
    })

    it('returns error when checkout is null', () => {
      const result = validateCheckoutState(null)

      expect(result).toEqual({
        valid: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('returns error when checkout is already completed', () => {
      const checkout = createCheckoutForValidation({
        completedAt: new Date('2024-01-15T12:00:00Z'),
      })

      const result = validateCheckoutState(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Checkout has already been completed',
        status: 410,
      })
    })
  })

  describe('validateCartNotEmpty', () => {
    it('returns valid for cart with items', () => {
      const cartItems = [createCartItem()]

      const result = validateCartNotEmpty(cartItems)

      expect(result).toEqual({ valid: true })
    })

    it('returns valid for cart with multiple items', () => {
      const cartItems = [createCartItem(), createCartItem(), createCartItem()]

      const result = validateCartNotEmpty(cartItems)

      expect(result).toEqual({ valid: true })
    })

    it('returns error for empty array', () => {
      const result = validateCartNotEmpty([])

      expect(result).toEqual({
        valid: false,
        error: 'Cart is empty',
        status: 400,
      })
    })

    it('returns error for null', () => {
      const result = validateCartNotEmpty(null)

      expect(result).toEqual({
        valid: false,
        error: 'Cart is empty',
        status: 400,
      })
    })

    it('returns error for undefined', () => {
      const result = validateCartNotEmpty(undefined)

      expect(result).toEqual({
        valid: false,
        error: 'Cart is empty',
        status: 400,
      })
    })
  })

  describe('validateCheckoutComplete', () => {
    it('returns valid for complete checkout', () => {
      const checkout = createCheckoutForValidation()

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({ valid: true })
    })

    it('returns not found for null checkout', () => {
      const result = validateCheckoutComplete(null)

      expect(result).toEqual({
        valid: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('returns error for completed checkout', () => {
      const checkout = createCheckoutForValidation({
        completedAt: new Date(),
      })

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Checkout has already been completed',
        status: 410,
      })
    })

    it('returns error for empty cart', () => {
      const checkout = createCheckoutForValidation({
        cartItems: [],
      })

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Cart is empty',
        status: 400,
      })
    })

    it('returns error for missing email', () => {
      const checkout = createCheckoutForValidation({
        email: null,
      })

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Customer email is required',
        status: 400,
      })
    })

    it('returns error for missing shipping address', () => {
      const checkout = createCheckoutForValidation({
        shippingAddress: null,
      })

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Shipping address is required',
        status: 400,
      })
    })

    it('returns error for missing shipping method', () => {
      const checkout = createCheckoutForValidation({
        shippingRateId: null,
      })

      const result = validateCheckoutComplete(checkout)

      expect(result).toEqual({
        valid: false,
        error: 'Shipping method is required',
        status: 400,
      })
    })

    it('validates in correct order: state -> cart -> payment fields', () => {
      // All invalid - should return first error (state)
      const result1 = validateCheckoutComplete(null)
      expect((result1 as { error: string }).error).toBe('Checkout not found')

      // Completed + empty cart + no email - should return completed error
      const result2 = validateCheckoutComplete(
        createCheckoutForValidation({
          completedAt: new Date(),
          cartItems: [],
          email: null,
        }),
      )
      expect((result2 as { error: string }).error).toBe(
        'Checkout has already been completed',
      )

      // Empty cart + no email - should return cart error
      const result3 = validateCheckoutComplete(
        createCheckoutForValidation({
          cartItems: [],
          email: null,
        }),
      )
      expect((result3 as { error: string }).error).toBe('Cart is empty')
    })
  })
})
