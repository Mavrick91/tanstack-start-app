import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Checkout, AddressInput, ShippingRate } from '../types/checkout'

// Zustand store for checkout ID persistence
type CheckoutIdStore = {
  checkoutId: string | null
  setCheckoutId: (id: string | null) => void
  clearCheckoutId: () => void
}

export const useCheckoutIdStore = create<CheckoutIdStore>()(
  persist(
    (set) => ({
      checkoutId: null,
      setCheckoutId: (id) => set({ checkoutId: id }),
      clearCheckoutId: () => set({ checkoutId: null }),
    }),
    {
      name: 'checkout-id',
    },
  ),
)

// API functions
async function createCheckoutApi(
  items: Array<{ productId: string; variantId?: string; quantity: number }>,
): Promise<Checkout> {
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
  return data.checkout
}

async function getCheckoutApi(checkoutId: string): Promise<Checkout> {
  const response = await fetch(`/api/checkout/${checkoutId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch checkout')
  }

  const data = await response.json()
  return data.checkout
}

async function saveCustomerInfoApi(
  checkoutId: string,
  data: {
    email: string
    firstName?: string
    lastName?: string
    createAccount?: boolean
    password?: string
  },
): Promise<Checkout> {
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

  const result = await response.json()
  return result.checkout
}

async function saveShippingAddressApi(
  checkoutId: string,
  address: AddressInput & { saveAddress?: boolean },
): Promise<Checkout> {
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

  const result = await response.json()
  return result.checkout
}

async function getShippingRatesApi(
  checkoutId: string,
): Promise<ShippingRate[]> {
  const response = await fetch(`/api/checkout/${checkoutId}/shipping-rates`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch shipping rates')
  }

  const data = await response.json()
  return data.shippingRates
}

async function saveShippingMethodApi(
  checkoutId: string,
  shippingRateId: string,
): Promise<Checkout> {
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

  const result = await response.json()
  return result.checkout
}

async function createStripePaymentIntentApi(checkoutId: string) {
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

async function completeCheckoutApi(
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

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  detail: (id: string) => [...checkoutKeys.all, id] as const,
  shippingRates: (id: string) =>
    [...checkoutKeys.detail(id), 'shipping-rates'] as const,
}

// React Query hooks
export function useCheckout(checkoutId: string | null) {
  return useQuery({
    queryKey: checkoutId
      ? checkoutKeys.detail(checkoutId)
      : ['checkout', 'none'],
    queryFn: () => (checkoutId ? getCheckoutApi(checkoutId) : null),
    enabled: !!checkoutId,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useShippingRates(checkoutId: string | null) {
  return useQuery({
    queryKey: checkoutId
      ? checkoutKeys.shippingRates(checkoutId)
      : ['shipping-rates', 'none'],
    queryFn: () => (checkoutId ? getShippingRatesApi(checkoutId) : []),
    enabled: !!checkoutId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateCheckout() {
  const queryClient = useQueryClient()
  const setCheckoutId = useCheckoutIdStore((s) => s.setCheckoutId)

  return useMutation({
    mutationFn: createCheckoutApi,
    onSuccess: (checkout) => {
      setCheckoutId(checkout.id)
      queryClient.setQueryData(checkoutKeys.detail(checkout.id), checkout)
    },
  })
}

export function useSaveCustomerInfo(checkoutId: string) {
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

export function useSaveShippingAddress(checkoutId: string) {
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

export function useSaveShippingMethod(checkoutId: string) {
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

export function useCreateStripePaymentIntent(checkoutId: string) {
  return useMutation({
    mutationFn: () => createStripePaymentIntentApi(checkoutId),
  })
}

export function useCompleteCheckout(checkoutId: string) {
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
      clearCheckoutId()
      queryClient.removeQueries({ queryKey: checkoutKeys.detail(checkoutId) })
    },
  })
}
