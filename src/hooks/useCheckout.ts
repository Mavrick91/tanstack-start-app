import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  createCheckoutFn,
  getCheckoutFn,
  getShippingRatesFn,
  saveCustomerInfoFn,
  saveShippingAddressFn,
  saveShippingMethodFn,
  completeCheckoutFn,
} from '../server/checkout'

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

// Checkout API functions using server functions
export const createCheckout = async (
  items: Array<{ productId: string; variantId?: string; quantity: number }>,
) => {
  const result = await createCheckoutFn({ data: { items } })
  return result.checkout as Checkout
}

export const getCheckout = async (checkoutId: string) => {
  const result = await getCheckoutFn({ data: { checkoutId } })
  return result.checkout as Checkout
}

export const saveCustomerInfo = async (
  checkoutId: string,
  data: {
    email: string
    firstName?: string
    lastName?: string
    createAccount?: boolean
    password?: string
  },
) => {
  const result = await saveCustomerInfoFn({
    data: {
      checkoutId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      createAccount: data.createAccount,
      password: data.password,
    },
  })
  return result
}

export const saveShippingAddress = async (
  checkoutId: string,
  address: AddressInput & { saveAddress?: boolean },
) => {
  const { saveAddress, ...addressData } = address
  const result = await saveShippingAddressFn({
    data: {
      checkoutId,
      address: addressData,
      saveAddress,
    },
  })
  return result
}

export const getShippingRates = async (checkoutId: string) => {
  const result = await getShippingRatesFn({ data: { checkoutId } })
  return result.shippingRates as ShippingRate[]
}

export const saveShippingMethod = async (
  checkoutId: string,
  shippingRateId: string,
) => {
  const result = await saveShippingMethodFn({
    data: { checkoutId, shippingRateId },
  })
  return result
}

// Stripe payment intent - still uses fetch because it needs special handling
// for returning client secret to the browser
export const createStripePaymentIntent = async (checkoutId: string) => {
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

export const completeCheckout = async (
  checkoutId: string,
  paymentProvider: 'stripe' | 'paypal',
  paymentId: string,
) => {
  const result = await completeCheckoutFn({
    data: { checkoutId, paymentProvider, paymentId },
  })
  return result
}

// Hook for easy access
export const useCheckout = () => {
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
