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
      useAuthStore.getState().logout()
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
      name: 'Test User',
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
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
      },
    })

    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should persist auth state via getState', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })
})
