import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCheckoutIdStore,
  useCheckout,
  useCreateCheckout,
  useSaveCustomerInfo,
  useSaveShippingAddress,
  useShippingRates,
  useSaveShippingMethod,
  useCreateStripePaymentIntent,
  useCompleteCheckout,
} from './useCheckoutQueries'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
}

const MOCK_CHECKOUT = {
  id: 'checkout-123',
  email: 'test@example.com',
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
}

const MOCK_SHIPPING_RATES = [
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

describe('useCheckoutIdStore', () => {
  beforeEach(() => {
    // Reset the store
    act(() => {
      useCheckoutIdStore.getState().clearCheckoutId()
    })
  })

  it('should have null checkoutId initially', () => {
    const { result } = renderHook(() => useCheckoutIdStore())
    expect(result.current.checkoutId).toBeNull()
  })

  it('should set checkoutId', () => {
    const { result } = renderHook(() => useCheckoutIdStore())

    act(() => {
      result.current.setCheckoutId('checkout-456')
    })

    expect(result.current.checkoutId).toBe('checkout-456')
  })

  it('should clear checkoutId', () => {
    const { result } = renderHook(() => useCheckoutIdStore())

    act(() => {
      result.current.setCheckoutId('checkout-789')
    })

    expect(result.current.checkoutId).toBe('checkout-789')

    act(() => {
      result.current.clearCheckoutId()
    })

    expect(result.current.checkoutId).toBeNull()
  })
})

describe('useCheckout', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should not fetch if checkoutId is null', async () => {
    const wrapper = createWrapper()
    renderHook(() => useCheckout(null), { wrapper })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch checkout when checkoutId is provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCheckout('checkout-123'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(MOCK_CHECKOUT)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Checkout not found' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCheckout('invalid-id'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Checkout not found')
  })
})

describe('useCreateCheckout', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    act(() => {
      useCheckoutIdStore.getState().clearCheckoutId()
    })
  })

  it('should create checkout and update store', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkout: MOCK_CHECKOUT }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateCheckout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync([
        { productId: 'prod-1', variantId: 'var-1', quantity: 2 },
      ])
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/create',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    // Check that checkoutId was set in store
    expect(useCheckoutIdStore.getState().checkoutId).toBe('checkout-123')
  })

  it('should handle create checkout error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Cart is empty' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateCheckout(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync([])
      }),
    ).rejects.toThrow('Cart is empty')
  })
})

describe('useSaveCustomerInfo', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should save customer email', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          checkout: { ...MOCK_CHECKOUT, email: 'new@example.com' },
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSaveCustomerInfo('checkout-123'), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@example.com' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/customer',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com' }),
      }),
    )
  })

  it('should handle save customer info error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid email' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSaveCustomerInfo('checkout-123'), {
      wrapper,
    })

    await expect(
      act(async () => {
        await result.current.mutateAsync({ email: 'invalid' })
      }),
    ).rejects.toThrow('Invalid email')
  })
})

describe('useSaveShippingAddress', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

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
          checkout: { ...MOCK_CHECKOUT, shippingAddress: validAddress },
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSaveShippingAddress('checkout-123'),
      { wrapper },
    )

    await act(async () => {
      await result.current.mutateAsync(validAddress)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/shipping-address',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('should handle save address error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Address is required' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSaveShippingAddress('checkout-123'),
      { wrapper },
    )

    await expect(
      act(async () => {
        await result.current.mutateAsync({ ...validAddress, address1: '' })
      }),
    ).rejects.toThrow('Address is required')
  })
})

describe('useShippingRates', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should not fetch if checkoutId is null', async () => {
    const wrapper = createWrapper()
    renderHook(() => useShippingRates(null), { wrapper })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch shipping rates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ shippingRates: MOCK_SHIPPING_RATES }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useShippingRates('checkout-123'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(MOCK_SHIPPING_RATES)
  })
})

describe('useSaveShippingMethod', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should save shipping method', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          checkout: {
            ...MOCK_CHECKOUT,
            shippingRateId: 'standard',
            shippingMethod: 'Standard Shipping',
          },
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSaveShippingMethod('checkout-123'), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync('standard')
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/shipping-method',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ shippingRateId: 'standard' }),
      }),
    )
  })
})

describe('useCreateStripePaymentIntent', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should create Stripe payment intent', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          clientSecret: 'pi_secret_123',
          publishableKey: 'pk_test_123',
          paymentIntentId: 'pi_123',
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useCreateStripePaymentIntent('checkout-123'),
      { wrapper },
    )

    let data: { clientSecret: string; publishableKey: string } | undefined
    await act(async () => {
      data = await result.current.mutateAsync()
    })

    expect(data?.clientSecret).toBe('pi_secret_123')
    expect(data?.publishableKey).toBe('pk_test_123')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/payment/stripe',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should handle payment intent error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Checkout incomplete' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useCreateStripePaymentIntent('checkout-123'),
      { wrapper },
    )

    await expect(
      act(async () => {
        await result.current.mutateAsync()
      }),
    ).rejects.toThrow('Checkout incomplete')
  })
})

describe('useCompleteCheckout', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should complete checkout with Stripe', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          order: {
            id: 'order-123',
            orderNumber: 1001,
          },
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCompleteCheckout('checkout-123'), {
      wrapper,
    })

    let data: { order: { id: string; orderNumber: number } } | undefined
    await act(async () => {
      data = await result.current.mutateAsync({
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })
    })

    expect(data?.order.orderNumber).toBe(1001)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/complete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          paymentProvider: 'stripe',
          paymentId: 'pi_123',
        }),
      }),
    )
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

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCompleteCheckout('checkout-123'), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        paymentProvider: 'paypal',
        paymentId: 'paypal-order-123',
      })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/checkout/checkout-123/complete',
      expect.objectContaining({
        body: JSON.stringify({
          paymentProvider: 'paypal',
          paymentId: 'paypal-order-123',
        }),
      }),
    )
  })

  it('should handle complete checkout error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Payment failed' }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCompleteCheckout('checkout-123'), {
      wrapper,
    })

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          paymentProvider: 'stripe',
          paymentId: 'pi_failed',
        })
      }),
    ).rejects.toThrow('Payment failed')
  })
})
