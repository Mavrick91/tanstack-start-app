import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from './useAuth'

// Mock fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Auth Guard Logic', () => {
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

  it('should return isAuthenticated false when not logged in', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should return isAuthenticated true after login', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'admin@finenail.com',
            role: 'admin',
          },
        }),
    })

    const state = useAuthStore.getState()
    const success = await state.login('admin@finenail.com', 'admin123')

    expect(success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should provide user info after login', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'admin@finenail.com',
            role: 'admin',
          },
        }),
    })

    const state = useAuthStore.getState()
    await state.login('admin@finenail.com', 'admin123')

    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    expect(user?.email).toBe('admin@finenail.com')
    expect(user?.role).toBe('admin')
  })

  it('should clear user info after logout', async () => {
    // Setup: login first
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'admin@finenail.com',
            role: 'admin',
          },
        }),
    })

    const state = useAuthStore.getState()
    await state.login('admin@finenail.com', 'admin123')
    expect(useAuthStore.getState().user).not.toBeNull()

    // Mock logout response
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    // Logout
    await state.logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
