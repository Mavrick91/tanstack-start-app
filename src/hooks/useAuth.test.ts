import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from './useAuth'

describe('useAuth Store', () => {
  afterEach(() => {
    // Reset the store between tests
    act(() => {
      useAuthStore.getState().logout()
    })
  })

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should login with correct credentials', async () => {
    const { result } = renderHook(() => useAuthStore())

    let success: boolean = false
    await act(async () => {
      success = await result.current.login('admin@finenail.com', 'admin123')
    })

    expect(success).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('admin@finenail.com')
  })

  it('should fail login with incorrect credentials', async () => {
    const { result } = renderHook(() => useAuthStore())

    let success: boolean = false
    await act(async () => {
      success = await result.current.login('wrong@email.com', 'wrongpass')
    })

    expect(success).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should logout and clear user state', async () => {
    const { result } = renderHook(() => useAuthStore())

    // Login first
    await act(async () => {
      await result.current.login('admin@finenail.com', 'admin123')
    })
    expect(result.current.isAuthenticated).toBe(true)

    // Then logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should expose getState for non-hook access', () => {
    const state = useAuthStore.getState()

    expect(typeof state.login).toBe('function')
    expect(typeof state.logout).toBe('function')
    expect(state.isAuthenticated).toBe(false)
  })
})
