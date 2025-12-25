import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from './useAuth'

// Mock fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('useAuth Store', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    act(() => {
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: true,
      })
    })
    localStorage.clear()
  })

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should login with correct credentials', async () => {
    const mockUser = {
      id: 'test-id',
      email: 'test@example.com',
      role: 'admin',
    }

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, user: mockUser }),
    })

    const { result } = renderHook(() => useAuthStore())

    let success
    await act(async () => {
      success = await result.current.login('test@example.com', 'password')
    })

    expect(success).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      credentials: 'include',
    })
  })

  it('should fail login with incorrect credentials', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({ success: false, error: 'Invalid email or password' }),
    })

    const { result } = renderHook(() => useAuthStore())

    let success
    await act(async () => {
      success = await result.current.login('wrong@example.com', 'wrong')
    })

    expect(success).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should logout and clear user state', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      },
    })

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should check session and update state', async () => {
    const mockUser = {
      id: 'test-id',
      email: 'test@example.com',
      role: 'admin',
    }

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, user: mockUser }),
    })

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.checkSession()
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(false)
  })
})
