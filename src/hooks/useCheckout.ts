import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { create } from 'zustand'

import {
  setCheckoutIdCookieClient,
  clearCheckoutIdCookieClient,
  getCheckoutIdFromCookie,
} from '../lib/checkout-cookies.client'
import {
  createCheckoutFn,
  getCheckoutFn,
  getShippingRatesFn,
  saveCustomerInfoFn,
  saveShippingAddressFn,
  saveShippingMethodFn,
  completeCheckoutFn,
  createStripePaymentIntentFn,
} from '../server/checkout'

import type { Checkout, AddressInput, ShippingRate } from '../types/checkout'

// Zustand store for checkout ID
// Cookie is the single source of truth - store is just a cache for React reactivity
type CheckoutIdStore = {
  checkoutId: string | null
  isInitialized: boolean
  setCheckoutId: (id: string | null) => void
  clearCheckoutId: () => void
  initFromCookie: () => void
}

export const useCheckoutIdStore = create<CheckoutIdStore>()((set, get) => ({
  checkoutId: null,
  isInitialized: false,

  setCheckoutId: (id) => {
    // Cookie is source of truth - update it first
    if (id) {
      setCheckoutIdCookieClient(id)
    } else {
      clearCheckoutIdCookieClient()
    }
    // Then sync store (cache) to reflect cookie state
    set({ checkoutId: id })
  },

  clearCheckoutId: () => {
    // Cookie is source of truth - clear it first
    clearCheckoutIdCookieClient()
    // Then sync store (cache)
    set({ checkoutId: null })
  },

  // Initialize store from cookie on first access
  initFromCookie: () => {
    if (get().isInitialized) return
    const id = getCheckoutIdFromCookie()
    set({ checkoutId: id, isInitialized: true })
  },
}))

// Hook that auto-initializes from cookie and returns the checkout ID
export const useCheckoutId = () => {
  const store = useCheckoutIdStore()

  useEffect(() => {
    store.initFromCookie()
  }, [store])

  return store.checkoutId
}

// API functions using server functions
const createCheckoutApi = async (
  items: Array<{ productId: string; variantId?: string; quantity: number }>,
) => {
  const result = await createCheckoutFn({ data: { items } })
  return result.checkout as Checkout
}

const getCheckoutApi = async (checkoutId: string) => {
  const result = await getCheckoutFn({ data: { checkoutId } })
  return result.checkout as Checkout
}

const saveCustomerInfoApi = async (
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
  // Return the updated checkout with email
  if (!result.checkout) {
    throw new Error('Failed to save customer info')
  }
  return {
    id: result.checkout.id,
    email: result.checkout.email,
    customerId: result.checkout.customerId,
  } as Checkout
}

const saveShippingAddressApi = async (
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
  return result.checkout as Checkout
}

const getShippingRatesApi = async (checkoutId: string) => {
  const result = await getShippingRatesFn({ data: { checkoutId } })
  return result.shippingRates as ShippingRate[]
}

const saveShippingMethodApi = async (
  checkoutId: string,
  shippingRateId: string,
) => {
  const result = await saveShippingMethodFn({
    data: { checkoutId, shippingRateId },
  })
  return result.checkout as Checkout
}

const completeCheckoutApi = async (
  checkoutId: string,
  paymentProvider: 'stripe' | 'paypal',
  paymentId: string,
) => {
  const result = await completeCheckoutFn({
    data: { checkoutId, paymentProvider, paymentId },
  })
  return result
}

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  detail: (id: string) => [...checkoutKeys.all, id] as const,
  shippingRates: (id: string) =>
    [...checkoutKeys.detail(id), 'shipping-rates'] as const,
}

// React Query hooks
export const useCheckout = (checkoutId: string | null) => {
  return useQuery({
    queryKey: checkoutId
      ? checkoutKeys.detail(checkoutId)
      : ['checkout', 'none'],
    queryFn: () => (checkoutId ? getCheckoutApi(checkoutId) : null),
    enabled: !!checkoutId,
    staleTime: 1000 * 60, // 1 minute
  })
}

export const useShippingRates = (checkoutId: string | null) => {
  return useQuery({
    queryKey: checkoutId
      ? checkoutKeys.shippingRates(checkoutId)
      : ['shipping-rates', 'none'],
    queryFn: () => (checkoutId ? getShippingRatesApi(checkoutId) : []),
    enabled: !!checkoutId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateCheckout = () => {
  const queryClient = useQueryClient()
  const setCheckoutId = useCheckoutIdStore((s) => s.setCheckoutId)

  return useMutation({
    mutationFn: createCheckoutApi,
    onSuccess: (checkout) => {
      // setCheckoutId handles both store update and cookie sync
      setCheckoutId(checkout.id)
      queryClient.setQueryData(checkoutKeys.detail(checkout.id), checkout)
    },
  })
}

export const useSaveCustomerInfo = (checkoutId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof saveCustomerInfoApi>[1]) =>
      saveCustomerInfoApi(checkoutId, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
      const previous = queryClient.getQueryData<Checkout>(
        checkoutKeys.detail(checkoutId),
      )

      // Optimistic update
      if (previous) {
        queryClient.setQueryData<Checkout>(checkoutKeys.detail(checkoutId), {
          ...previous,
          email: newData.email,
        })
      }

      return { previous }
    },
    onError: (_err, _newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          checkoutKeys.detail(checkoutId),
          context.previous,
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
    },
  })
}

export const useSaveShippingAddress = (checkoutId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (address: AddressInput & { saveAddress?: boolean }) =>
      saveShippingAddressApi(checkoutId, address),
    onMutate: async (newAddress) => {
      await queryClient.cancelQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
      const previous = queryClient.getQueryData<Checkout>(
        checkoutKeys.detail(checkoutId),
      )

      // Optimistic update
      if (previous) {
        queryClient.setQueryData<Checkout>(checkoutKeys.detail(checkoutId), {
          ...previous,
          shippingAddress: {
            firstName: newAddress.firstName,
            lastName: newAddress.lastName,
            company: newAddress.company,
            address1: newAddress.address1,
            address2: newAddress.address2,
            city: newAddress.city,
            province: newAddress.province,
            provinceCode: newAddress.provinceCode,
            country: newAddress.country,
            countryCode: newAddress.countryCode,
            zip: newAddress.zip,
            phone: newAddress.phone,
          },
        })
      }

      return { previous }
    },
    onError: (_err, _newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          checkoutKeys.detail(checkoutId),
          context.previous,
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
    },
  })
}

export const useSaveShippingMethod = (checkoutId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shippingRateId: string) =>
      saveShippingMethodApi(checkoutId, shippingRateId),
    onMutate: async (shippingRateId) => {
      await queryClient.cancelQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
      const previous = queryClient.getQueryData<Checkout>(
        checkoutKeys.detail(checkoutId),
      )

      // Optimistic update
      if (previous) {
        queryClient.setQueryData<Checkout>(checkoutKeys.detail(checkoutId), {
          ...previous,
          shippingRateId,
        })
      }

      return { previous }
    },
    onError: (_err, _newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          checkoutKeys.detail(checkoutId),
          context.previous,
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: checkoutKeys.detail(checkoutId),
      })
    },
  })
}

// Stripe payment intent API using server function
const createStripePaymentIntentApi = async (checkoutId: string) => {
  return await createStripePaymentIntentFn({ data: { checkoutId } })
}

export const useCreateStripePaymentIntent = (checkoutId: string) => {
  return useMutation({
    mutationFn: () => createStripePaymentIntentApi(checkoutId),
  })
}

export const useCompleteCheckout = (checkoutId: string) => {
  const queryClient = useQueryClient()
  const clearCheckoutId = useCheckoutIdStore((s) => s.clearCheckoutId)

  return useMutation({
    mutationFn: ({
      paymentProvider,
      paymentId,
    }: {
      paymentProvider: 'stripe' | 'paypal'
      paymentId: string
    }) => completeCheckoutApi(checkoutId, paymentProvider, paymentId),
    onSuccess: () => {
      // clearCheckoutId handles both store update and cookie clear
      clearCheckoutId()
      queryClient.removeQueries({ queryKey: checkoutKeys.detail(checkoutId) })
    },
  })
}
