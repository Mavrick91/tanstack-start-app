import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAuth,
  useAuthLogin,
  useAuthLogout,
  useAuthRegister,
  useAuthForgotPassword,
  AUTH_QUERY_KEY,
} from './useAuth'
import { getMeFn, loginFn, logoutFn } from '../server/auth'
import { registerCustomerFn, forgotPasswordFn } from '../server/auth-customer'

import {
  act,
  renderHook,
  waitFor,
  createTestQueryClient,
} from '@/test/test-utils'

// Mock server functions
vi.mock('../server/auth', () => ({
  getMeFn: vi.fn(),
  loginFn: vi.fn(),
  logoutFn: vi.fn(),
}))

vi.mock('../server/auth-customer', () => ({
  registerCustomerFn: vi.fn(),
  forgotPasswordFn: vi.fn(),
}))

// Mock router
const mockInvalidate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mockInvalidate,
    }),
  }
})

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
  Wrapper.displayName = 'QueryClientWrapper'
  return { wrapper: Wrapper, queryClient }
}

const MOCK_USER = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'customer' as const,
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAuth (query)', () => {
    it('should fetch current user', async () => {
      vi.mocked(getMeFn).mockResolvedValue(MOCK_USER)

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(MOCK_USER)
      expect(getMeFn).toHaveBeenCalled()
    })

    it('should handle unauthenticated state', async () => {
      vi.mocked(getMeFn).mockResolvedValue(null)

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })

    it('should handle auth error', async () => {
      vi.mocked(getMeFn).mockRejectedValue(new Error('Unauthorized'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Unauthorized')
    })
  })

  describe('useAuthLogin', () => {
    it('should login successfully', async () => {
      vi.mocked(loginFn).mockResolvedValue({ user: MOCK_USER })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogin(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(loginFn).toHaveBeenCalledWith({
        data: { email: 'test@example.com', password: 'password123' },
      })
    })

    it('should invalidate auth queries on success', async () => {
      vi.mocked(loginFn).mockResolvedValue({ user: MOCK_USER })

      const { wrapper, queryClient } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useAuthLogin(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_QUERY_KEY })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['customer', 'session'],
      })
    })

    it('should invalidate router on success', async () => {
      vi.mocked(loginFn).mockResolvedValue({ user: MOCK_USER })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogin(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockInvalidate).toHaveBeenCalled()
    })

    it('should handle login error', async () => {
      vi.mocked(loginFn).mockRejectedValue(new Error('Invalid credentials'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogin(), { wrapper })

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: 'wrong',
          })
        }),
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('useAuthLogout', () => {
    it('should logout successfully', async () => {
      vi.mocked(logoutFn).mockResolvedValue({ success: true })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogout(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(logoutFn).toHaveBeenCalled()
    })

    it('should invalidate and remove auth queries on success', async () => {
      vi.mocked(logoutFn).mockResolvedValue({ success: true })

      const { wrapper, queryClient } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const removeSpy = vi.spyOn(queryClient, 'removeQueries')

      const { result } = renderHook(() => useAuthLogout(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: AUTH_QUERY_KEY })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['customer', 'session'],
      })
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: AUTH_QUERY_KEY })
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: ['customer', 'session'],
      })
    })

    it('should invalidate router on success', async () => {
      vi.mocked(logoutFn).mockResolvedValue({ success: true })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogout(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(mockInvalidate).toHaveBeenCalled()
    })

    it('should handle logout error', async () => {
      vi.mocked(logoutFn).mockRejectedValue(new Error('Logout failed'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthLogout(), { wrapper })

      await expect(
        act(async () => {
          await result.current.mutateAsync()
        }),
      ).rejects.toThrow('Logout failed')
    })
  })

  describe('useAuthRegister', () => {
    it('should register customer successfully', async () => {
      vi.mocked(registerCustomerFn).mockResolvedValue({
        success: true,
        message: 'Verification email sent',
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthRegister(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'new@example.com',
          password: 'password123',
          lang: 'en',
        })
      })

      expect(registerCustomerFn).toHaveBeenCalledWith({
        data: { email: 'new@example.com', password: 'password123', lang: 'en' },
      })
    })

    it('should support different languages', async () => {
      vi.mocked(registerCustomerFn).mockResolvedValue({
        success: true,
        message: 'Verification email sent',
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthRegister(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'new@example.com',
          password: 'password123',
          lang: 'fr',
        })
      })

      expect(registerCustomerFn).toHaveBeenCalledWith({
        data: { email: 'new@example.com', password: 'password123', lang: 'fr' },
      })
    })

    it('should handle registration error', async () => {
      vi.mocked(registerCustomerFn).mockRejectedValue(
        new Error('Email already exists'),
      )

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthRegister(), { wrapper })

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'existing@example.com',
            password: 'password123',
            lang: 'en',
          })
        }),
      ).rejects.toThrow('Email already exists')
    })
  })

  describe('useAuthForgotPassword', () => {
    it('should send forgot password email successfully', async () => {
      vi.mocked(forgotPasswordFn).mockResolvedValue({
        success: true,
        message: 'If an account exists, a reset email has been sent',
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthForgotPassword(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          lang: 'en',
        })
      })

      expect(forgotPasswordFn).toHaveBeenCalledWith({
        data: { email: 'test@example.com', lang: 'en' },
      })
    })

    it('should support different languages', async () => {
      vi.mocked(forgotPasswordFn).mockResolvedValue({
        success: true,
        message: 'If an account exists, a reset email has been sent',
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthForgotPassword(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          lang: 'fr',
        })
      })

      expect(forgotPasswordFn).toHaveBeenCalledWith({
        data: { email: 'test@example.com', lang: 'fr' },
      })
    })

    it('should handle forgot password error', async () => {
      vi.mocked(forgotPasswordFn).mockRejectedValue(new Error('User not found'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useAuthForgotPassword(), { wrapper })

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'nonexistent@example.com',
            lang: 'en',
          })
        }),
      ).rejects.toThrow('User not found')
    })
  })
})
