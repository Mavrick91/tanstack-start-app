import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server functions
vi.mock('../server/auth', () => ({
  loginFn: vi.fn(),
  logoutFn: vi.fn(),
  getMeFn: vi.fn(),
}))

import { useAuthStore } from './useAuth'
import { loginFn, logoutFn, getMeFn } from '../server/auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: true,
    })
  })

  describe('login', () => {
    it('should set user on successful login', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' }
      vi.mocked(loginFn).mockResolvedValueOnce({
        user: mockUser,
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const response = await result.current.login(
          'test@example.com',
          'password',
        )
        expect(response.success).toBe(true)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should return error on failed login', async () => {
      // Errors are now thrown via json()
      vi.mocked(loginFn).mockRejectedValueOnce(
        new Error('Invalid email or password'),
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const response = await result.current.login('test@example.com', 'wrong')
        expect(response.success).toBe(false)
        expect(response.error).toBe('Invalid email or password')
      })

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user on logout', async () => {
      vi.mocked(logoutFn).mockResolvedValueOnce({ success: true })

      useAuthStore.setState({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('checkSession', () => {
    it('should set user if session exists', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' }
      vi.mocked(getMeFn).mockResolvedValueOnce(mockUser)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkSession()
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear user if no session', async () => {
      vi.mocked(getMeFn).mockResolvedValueOnce(null)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.checkSession()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })
})
