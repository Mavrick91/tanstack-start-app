import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { getMeFn, loginFn, logoutFn, type AuthUser } from '../server/auth'
import {
  registerCustomerFn,
  forgotPasswordFn,
  resendVerificationEmailFn,
} from '../server/auth-customer'

export const AUTH_QUERY_KEY = ['auth'] as const

export const useAuth = () => {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMeFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useAuthLogin = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      loginFn({ data }),
    onSuccess: async () => {
      // Invalidate both auth query keys - admin uses ['auth'], customer pages use ['customer', 'session']
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['customer', 'session'] })
      await router.invalidate()
    },
  })
}

export const useAuthLogout = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: async () => {
      // Invalidate and remove both auth query keys
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['customer', 'session'] })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY })
      queryClient.removeQueries({ queryKey: ['customer', 'session'] })
      await router.invalidate()
    },
  })
}

export const useAuthRegister = () => {
  return useMutation({
    mutationFn: (data: {
      email: string
      password: string
      lang: 'en' | 'fr' | 'id'
    }) => registerCustomerFn({ data }),
  })
}

export const useAuthForgotPassword = () => {
  return useMutation({
    mutationFn: (data: { email: string; lang: 'en' | 'fr' | 'id' }) =>
      forgotPasswordFn({ data }),
  })
}

export const useResendVerification = () => {
  return useMutation({
    mutationFn: (data: { email: string; lang: 'en' | 'fr' | 'id' }) =>
      resendVerificationEmailFn({ data }),
  })
}

// Re-export AuthUser type for consumers
export type { AuthUser }
