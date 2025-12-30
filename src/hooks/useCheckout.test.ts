import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCheckoutStore,
  useCheckout,
  createCheckout,
  getCheckout,
  saveCustomerInfo,
  saveShippingAddress,
  getShippingRates,
  saveShippingMethod,
  createStripePaymentIntent,
  completeCheckout,
} from './useCheckout'

import type { Checkout, ShippingRate } from '../types/checkout'

import { act, renderHook } from '@/test/test-utils'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_CHECKOUT: Checkout = {
  id: 'checkout-123',
  cartItems: [
    {
      productId: 'prod-1',
      variantId: 'var-1',
      quantity: 2,
      title: 'Test Product',
      price: 29.99,
    },
  ],
  subtotal: 59.98,
  shippingTotal: 5.99,
  taxTotal: 0,
  total: 65.97,
  currency: 'USD',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const MOCK_SHIPPING_RATES: ShippingRate[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 5.99,
    estimatedDays: '5-7 business days',
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 14.99,
    estimatedDays: '2-3 business days',
  },
]

describe('useCheckoutStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    act(() => {
      useCheckoutStore.getState().clearCheckout()
    })
    mockFetch.mockReset()
  })

  describe('Initial State', () => {
    it('should have null checkoutId initially', () => {
      const { result } = renderHook(() => useCheckoutStore())
      expect(result.current.checkoutId).toBeNull()
    })

    it('should have null checkout initially', () => {
      const { result } = renderHook(() => useCheckoutStore())
      expect(result.current.checkout).toBeNull()
    })

    it('should have empty shipping rates initially', () => {
      const { result } = renderHook(() => useCheckoutStore())
      expect(result.current.shippingRates).toEqual([])
    })

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useCheckoutStore())
      expect(result.current.isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const { result } = renderHook(() => useCheckoutStore())
      expect(result.current.error).toBeNull()
    })
  })

  describe('Actions', () => {
    it('should set checkoutId', () => {
      const { result } = renderHook(() => useCheckoutStore())

      act(() => {
        result.current.setCheckoutId('checkout-456')
      })

      expect(result.current.checkoutId).toBe('checkout-456')
    })

    it('should set checkout', () => {
      const { result } = renderHook(() => useCheckoutStore())

      act(() => {
        result.current.setCheckout(MOCK_CHECKOUT)
      })

      expect(result.current.checkout).toEqual(MOCK_CHECKOUT)
    })

    it('should set shipping rates', () => {
      const { result } = renderHook(() => useCheckoutStore())

      act(() => {
        result.current.setShippingRates(MOCK_SHIPPING_RATES)
      })

      expect(result.current.shippingRates).toEqual(MOCK_SHIPPING_RATES)
    })

    it('should set loading state', () => {
      const { result } = renderHook(() => useCheckoutStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should set error', () => {
      const { result } = renderHook(() => useCheckoutStore())

      act(() => {
        result.current.setError('Something went wrong')
      })

      expect(result.current.error).toBe('Something went wrong')
    })

    it('should clear checkout state', () => {
      const { result } = renderHook(() => useCheckoutStore())

      // Set some state first
      act(() => {
        result.current.setCheckoutId('checkout-789')
        result.current.setCheckout(MOCK_CHECKOUT)
        result.current.setShippingRates(MOCK_SHIPPING_RATES)
        result.current.setError('Some error')
      })

      // Clear it
      act(() => {
        result.current.clearCheckout()
      })

      expect(result.current.checkoutId).toBeNull()
      expect(result.current.checkout).toBeNull()
      expect(result.current.shippingRates).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })
})

describe('Checkout API Functions', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('createCheckout', () => {
    it('should create a checkout from cart items', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
      })

      const items = [{ productId: 'prod-1', variantId: 'var-1', quantity: 2 }]
      const result = await createCheckout(items)

      expect(mockFetch).toHaveBeenCalledWith('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      })
      expect(result).toEqual(MOCK_CHECKOUT)
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cart is empty' }),
      })

      const items = [{ productId: 'prod-1', quantity: 1 }]
      await expect(createCheckout(items)).rejects.toThrow('Cart is empty')
    })
  })

  describe('getCheckout', () => {
    it('should fetch checkout by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
      })

      const result = await getCheckout('checkout-123')

      expect(mockFetch).toHaveBeenCalledWith('/api/checkout/checkout-123', {
        credentials: 'include',
      })
      expect(result).toEqual(MOCK_CHECKOUT)
    })

    it('should throw error when checkout not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Checkout not found' }),
      })

      await expect(getCheckout('invalid-id')).rejects.toThrow(
        'Checkout not found',
      )
    })
  })

  describe('saveCustomerInfo', () => {
    it('should save customer email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            checkout: { id: 'checkout-123', email: 'test@example.com' },
          }),
      })

      const result = await saveCustomerInfo('checkout-123', {
        email: 'test@example.com',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/customer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com' }),
        },
      )
      expect(result.checkout.email).toBe('test@example.com')
    })

    it('should save customer info with account creation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            checkout: { id: 'checkout-123', email: 'test@example.com' },
          }),
      })

      await saveCustomerInfo('checkout-123', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createAccount: true,
        password: 'securePass123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/customer',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            createAccount: true,
            password: 'securePass123',
          }),
        }),
      )
    })

    it('should throw error on invalid email', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid email format' }),
      })

      await expect(
        saveCustomerInfo('checkout-123', { email: 'invalid' }),
      ).rejects.toThrow('Invalid email format')
    })
  })

  describe('saveShippingAddress', () => {
    const validAddress = {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      country: 'United States',
      countryCode: 'US',
      zip: '10001',
    }

    it('should save shipping address', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            checkout: { id: 'checkout-123', shippingAddress: validAddress },
          }),
      })

      const result = await saveShippingAddress('checkout-123', validAddress)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/shipping-address',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(validAddress),
        },
      )
      expect(result.checkout.shippingAddress).toEqual(validAddress)
    })

    it('should throw error on missing required fields', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'First name is required' }),
      })

      await expect(
        saveShippingAddress('checkout-123', {
          ...validAddress,
          firstName: '',
        }),
      ).rejects.toThrow('First name is required')
    })
  })

  describe('getShippingRates', () => {
    it('should fetch available shipping rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ shippingRates: MOCK_SHIPPING_RATES }),
      })

      const result = await getShippingRates('checkout-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/shipping-rates',
        { credentials: 'include' },
      )
      expect(result).toEqual(MOCK_SHIPPING_RATES)
    })
  })

  describe('saveShippingMethod', () => {
    it('should save selected shipping method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            checkout: {
              id: 'checkout-123',
              shippingRateId: 'standard',
              shippingTotal: 5.99,
            },
          }),
      })

      const result = await saveShippingMethod('checkout-123', 'standard')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/shipping-method',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ shippingRateId: 'standard' }),
        },
      )
      expect(result.checkout.shippingRateId).toBe('standard')
    })

    it('should throw error on invalid shipping rate', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid shipping rate' }),
      })

      await expect(
        saveShippingMethod('checkout-123', 'invalid'),
      ).rejects.toThrow('Invalid shipping rate')
    })
  })

  describe('createStripePaymentIntent', () => {
    it('should create a Stripe payment intent', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            clientSecret: 'pi_secret_123',
            paymentIntentId: 'pi_123',
            publishableKey: 'pk_test_123',
          }),
      })

      const result = await createStripePaymentIntent('checkout-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/payment/stripe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )
      expect(result.clientSecret).toBe('pi_secret_123')
      expect(result.publishableKey).toBe('pk_test_123')
    })

    it('should throw error when checkout is incomplete', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Shipping address is required' }),
      })

      await expect(createStripePaymentIntent('checkout-123')).rejects.toThrow(
        'Shipping address is required',
      )
    })
  })

  describe('completeCheckout', () => {
    it('should complete checkout with Stripe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            order: {
              id: 'order-123',
              orderNumber: 1001,
              email: 'test@example.com',
              total: 65.97,
            },
          }),
      })

      const result = await completeCheckout('checkout-123', 'stripe', 'pi_123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paymentProvider: 'stripe',
            paymentId: 'pi_123',
          }),
        },
      )
      expect(result.order.orderNumber).toBe(1001)
    })

    it('should complete checkout with PayPal', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            order: {
              id: 'order-124',
              orderNumber: 1002,
            },
          }),
      })

      const result = await completeCheckout(
        'checkout-123',
        'paypal',
        'paypal-order-123',
      )

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/checkout/checkout-123/complete',
        expect.objectContaining({
          body: JSON.stringify({
            paymentProvider: 'paypal',
            paymentId: 'paypal-order-123',
          }),
        }),
      )
      expect(result.order.orderNumber).toBe(1002)
    })

    it('should throw error when checkout already completed', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ error: 'Checkout has already been completed' }),
      })

      await expect(
        completeCheckout('checkout-123', 'stripe', 'pi_123'),
      ).rejects.toThrow('Checkout has already been completed')
    })
  })
})

describe('useCheckout hook', () => {
  beforeEach(() => {
    act(() => {
      useCheckoutStore.getState().clearCheckout()
    })
    mockFetch.mockReset()
  })

  it('should expose store state and actions', () => {
    const { result } = renderHook(() => useCheckout())

    expect(result.current.checkoutId).toBeNull()
    expect(result.current.checkout).toBeNull()
    expect(result.current.shippingRates).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.createCheckout).toBe('function')
    expect(typeof result.current.loadCheckout).toBe('function')
    expect(typeof result.current.loadShippingRates).toBe('function')
  })

  it('should create checkout and update store', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
    })

    const { result } = renderHook(() => useCheckout())

    let checkout: Checkout | undefined
    await act(async () => {
      checkout = await result.current.createCheckout([
        { productId: 'prod-1', quantity: 2 },
      ])
    })

    expect(checkout).toEqual(MOCK_CHECKOUT)
    expect(result.current.checkoutId).toBe(MOCK_CHECKOUT.id)
    expect(result.current.checkout).toEqual(MOCK_CHECKOUT)
  })

  it('should handle createCheckout error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to create checkout' }),
    })

    const { result } = renderHook(() => useCheckout())

    await act(async () => {
      try {
        await result.current.createCheckout([
          { productId: 'prod-1', quantity: 1 },
        ])
      } catch {
        // Expected error
      }
    })

    expect(result.current.error).toBe('Failed to create checkout')
  })

  it('should load checkout and update store', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
    })

    const { result } = renderHook(() => useCheckout())

    await act(async () => {
      await result.current.loadCheckout('checkout-123')
    })

    expect(result.current.checkout).toEqual(MOCK_CHECKOUT)
  })

  it('should load shipping rates and update store', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ shippingRates: MOCK_SHIPPING_RATES }),
    })

    const { result } = renderHook(() => useCheckout())

    await act(async () => {
      await result.current.loadShippingRates('checkout-123')
    })

    expect(result.current.shippingRates).toEqual(MOCK_SHIPPING_RATES)
  })
})
