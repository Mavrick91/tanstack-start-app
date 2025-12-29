import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Checkout, AddressInput, ShippingRate } from '../types/checkout'

type CheckoutState = {
  checkoutId: string | null
  checkout: Checkout | null
  shippingRates: ShippingRate[]
  isLoading: boolean
  error: string | null

  // Actions
  setCheckoutId: (id: string | null) => void
  setCheckout: (checkout: Checkout | null) => void
  setShippingRates: (rates: ShippingRate[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearCheckout: () => void
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      checkoutId: null,
      checkout: null,
      shippingRates: [],
      isLoading: false,
      error: null,

      setCheckoutId: (id) => set({ checkoutId: id }),
      setCheckout: (checkout) => set({ checkout }),
      setShippingRates: (rates) => set({ shippingRates: rates }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearCheckout: () =>
        set({
          checkoutId: null,
          checkout: null,
          shippingRates: [],
          error: null,
        }),
    }),
    {
      name: 'checkout-storage',
      partialize: (state) => ({
        checkoutId: state.checkoutId,
      }),
    },
  ),
)

// Checkout API functions
export async function createCheckout(
  items: Array<{ productId: string; variantId?: string; quantity: number }>,
) {
  const response = await fetch('/api/checkout/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout')
  }

  const data = await response.json()
  return data.checkout as Checkout
}

export async function getCheckout(checkoutId: string) {
  const response = await fetch(`/api/checkout/${checkoutId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch checkout')
  }

  const data = await response.json()
  return data.checkout as Checkout
}

export async function saveCustomerInfo(
  checkoutId: string,
  data: {
    email: string
    firstName?: string
    lastName?: string
    createAccount?: boolean
    password?: string
  },
) {
  const response = await fetch(`/api/checkout/${checkoutId}/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save customer info')
  }

  return await response.json()
}

export async function saveShippingAddress(
  checkoutId: string,
  address: AddressInput & { saveAddress?: boolean },
) {
  const response = await fetch(`/api/checkout/${checkoutId}/shipping-address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save shipping address')
  }

  return await response.json()
}

export async function getShippingRates(checkoutId: string) {
  const response = await fetch(`/api/checkout/${checkoutId}/shipping-rates`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch shipping rates')
  }

  const data = await response.json()
  return data.shippingRates as ShippingRate[]
}

export async function saveShippingMethod(
  checkoutId: string,
  shippingRateId: string,
) {
  const response = await fetch(`/api/checkout/${checkoutId}/shipping-method`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shippingRateId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save shipping method')
  }

  return await response.json()
}

export async function createStripePaymentIntent(checkoutId: string) {
  const response = await fetch(`/api/checkout/${checkoutId}/payment/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create payment intent')
  }

  return await response.json()
}

export async function completeCheckout(
  checkoutId: string,
  paymentProvider: 'stripe' | 'paypal',
  paymentId: string,
) {
  const response = await fetch(`/api/checkout/${checkoutId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ paymentProvider, paymentId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to complete checkout')
  }

  return await response.json()
}

// Hook for easy access
export function useCheckout() {
  const store = useCheckoutStore()

  return {
    ...store,
    createCheckout: async (
      items: Array<{ productId: string; variantId?: string; quantity: number }>,
    ) => {
      store.setLoading(true)
      store.setError(null)
      try {
        const checkout = await createCheckout(items)
        store.setCheckoutId(checkout.id)
        store.setCheckout(checkout)
        return checkout
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to create checkout'
        store.setError(error)
        throw err
      } finally {
        store.setLoading(false)
      }
    },
    loadCheckout: async (checkoutId: string) => {
      store.setLoading(true)
      store.setError(null)
      try {
        const checkout = await getCheckout(checkoutId)
        store.setCheckout(checkout)
        return checkout
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to load checkout'
        store.setError(error)
        throw err
      } finally {
        store.setLoading(false)
      }
    },
    loadShippingRates: async (checkoutId: string) => {
      try {
        const rates = await getShippingRates(checkoutId)
        store.setShippingRates(rates)
        return rates
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to load shipping rates'
        store.setError(error)
        throw err
      }
    },
  }
}
