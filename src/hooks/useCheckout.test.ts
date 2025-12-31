import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
} from './useCheckout'
import {
  createCheckoutFn,
  getCheckoutFn,
  getShippingRatesFn,
  saveCustomerInfoFn,
  saveShippingAddressFn,
  saveShippingMethodFn,
  completeCheckoutFn,
} from '../server/checkout'

import { renderHook, waitFor, act } from '@/test/test-utils'

// Mock the server functions
vi.mock('../server/checkout', () => ({
  createCheckoutFn: vi.fn(),
  getCheckoutFn: vi.fn(),
  getShippingRatesFn: vi.fn(),
  saveCustomerInfoFn: vi.fn(),
  saveShippingAddressFn: vi.fn(),
  saveShippingMethodFn: vi.fn(),
  completeCheckoutFn: vi.fn(),
}))

// Mock fetch for Stripe payment intent (still uses fetch)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Create wrapper with QueryClient
const createWrapper = () => {
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
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

const MOCK_CHECKOUT = {
  id: 'checkout-123',
  email: 'test@example.com',
  customerId: null,
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
  shippingAddress: null,
  billingAddress: null,
  shippingRateId: null,
  shippingMethod: null,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
}

const MOCK_SHIPPING_RATES = [
  {
    id: 'standard' as const,
    name: 'Standard Shipping' as const,
    price: 5.99,
    estimatedDays: '5-7 business days' as const,
    isFree: false,
  },
  {
    id: 'express' as const,
    name: 'Express Shipping' as const,
    price: 14.99,
    estimatedDays: '2-3 business days' as const,
    isFree: false,
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
    vi.clearAllMocks()
  })

  it('should not fetch if checkoutId is null', async () => {
    const wrapper = createWrapper()
    renderHook(() => useCheckout(null), { wrapper })

    expect(getCheckoutFn).not.toHaveBeenCalled()
  })

  it('should fetch checkout when checkoutId is provided', async () => {
    vi.mocked(getCheckoutFn).mockResolvedValue({ checkout: MOCK_CHECKOUT })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCheckout('checkout-123'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(MOCK_CHECKOUT)
    expect(getCheckoutFn).toHaveBeenCalledWith({
      data: { checkoutId: 'checkout-123' },
    })
  })

  it('should handle fetch error', async () => {
    vi.mocked(getCheckoutFn).mockRejectedValue(new Error('Checkout not found'))

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
    vi.clearAllMocks()
    act(() => {
      useCheckoutIdStore.getState().clearCheckoutId()
    })
  })

  it('should create checkout and update store', async () => {
    vi.mocked(createCheckoutFn).mockResolvedValue({ checkout: MOCK_CHECKOUT })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateCheckout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync([
        { productId: 'prod-1', variantId: 'var-1', quantity: 2 },
      ])
    })

    expect(createCheckoutFn).toHaveBeenCalledWith({
      data: {
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 2 }],
      },
    })

    // Check that checkoutId was set in store
    expect(useCheckoutIdStore.getState().checkoutId).toBe('checkout-123')
  })

  it('should handle create checkout error', async () => {
    vi.mocked(createCheckoutFn).mockRejectedValue(
      new Error('Cart items are required'),
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCreateCheckout(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync([])
      }),
    ).rejects.toThrow('Cart items are required')
  })
})

describe('useSaveCustomerInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save customer email', async () => {
    vi.mocked(saveCustomerInfoFn).mockResolvedValue({
      checkout: { ...MOCK_CHECKOUT, email: 'new@example.com' },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSaveCustomerInfo('checkout-123'), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@example.com' })
    })

    expect(saveCustomerInfoFn).toHaveBeenCalled()
  })

  it('should handle save customer info error', async () => {
    vi.mocked(saveCustomerInfoFn).mockRejectedValue(new Error('Invalid email'))

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
    vi.clearAllMocks()
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
    vi.mocked(saveShippingAddressFn).mockResolvedValue({
      checkout: { ...MOCK_CHECKOUT, shippingAddress: validAddress },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useSaveShippingAddress('checkout-123'),
      { wrapper },
    )

    await act(async () => {
      await result.current.mutateAsync(validAddress)
    })

    expect(saveShippingAddressFn).toHaveBeenCalled()
  })

  it('should handle save address error', async () => {
    vi.mocked(saveShippingAddressFn).mockRejectedValue(
      new Error('Address is required'),
    )

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
    vi.clearAllMocks()
  })

  it('should not fetch if checkoutId is null', async () => {
    const wrapper = createWrapper()
    renderHook(() => useShippingRates(null), { wrapper })

    expect(getShippingRatesFn).not.toHaveBeenCalled()
  })

  it('should fetch shipping rates', async () => {
    vi.mocked(getShippingRatesFn).mockResolvedValue({
      shippingRates: MOCK_SHIPPING_RATES,
      freeShippingThreshold: 75 as const,
      qualifiesForFreeShipping: false,
      amountUntilFreeShipping: 15.02,
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
    vi.clearAllMocks()
  })

  it('should save shipping method', async () => {
    vi.mocked(saveShippingMethodFn).mockResolvedValue({
      checkout: {
        ...MOCK_CHECKOUT,
        shippingRateId: 'standard',
        shippingMethod: 'Standard Shipping',
      },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useSaveShippingMethod('checkout-123'), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync('standard')
    })

    expect(saveShippingMethodFn).toHaveBeenCalledWith({
      data: { checkoutId: 'checkout-123', shippingRateId: 'standard' },
    })
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
    vi.clearAllMocks()
  })

  it('should complete checkout with Stripe', async () => {
    vi.mocked(completeCheckoutFn).mockResolvedValue({
      order: {
        id: 'order-123',
        orderNumber: 1001,
        email: 'test@example.com',
        total: 65.97,
      },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useCompleteCheckout('checkout-123'), {
      wrapper,
    })

    let data: { order?: { id: string; orderNumber: number } } | undefined
    await act(async () => {
      data = await result.current.mutateAsync({
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })
    })

    expect(data?.order?.orderNumber).toBe(1001)
    expect(completeCheckoutFn).toHaveBeenCalledWith({
      data: {
        checkoutId: 'checkout-123',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      },
    })
  })

  it('should complete checkout with PayPal', async () => {
    vi.mocked(completeCheckoutFn).mockResolvedValue({
      order: {
        id: 'order-124',
        orderNumber: 1002,
        email: 'test@example.com',
        total: 65.97,
      },
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

    expect(completeCheckoutFn).toHaveBeenCalledWith({
      data: {
        checkoutId: 'checkout-123',
        paymentProvider: 'paypal',
        paymentId: 'paypal-order-123',
      },
    })
  })

  it('should handle complete checkout error', async () => {
    vi.mocked(completeCheckoutFn).mockRejectedValue(new Error('Payment failed'))

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
