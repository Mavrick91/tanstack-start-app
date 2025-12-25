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
      useAuthStore.getState().logout()
    })
    localStorage.clear()
  })

  it('should return isAuthenticated false when not logged in', () => {
    const state = useAuthStore.getState()
    state.logout()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
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
            name: 'Admin User',
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
            name: 'Admin User',
          },
        }),
    })

    const state = useAuthStore.getState()
    await state.login('admin@finenail.com', 'admin123')

    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    expect(user?.email).toBe('admin@finenail.com')
    expect(user?.name).toBe('Admin User')
  })

  it('should clear user info after logout', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          user: {
            id: '1',
            email: 'admin@finenail.com',
            role: 'admin',
            name: 'Admin User',
          },
        }),
    })

    const state = useAuthStore.getState()
    await state.login('admin@finenail.com', 'admin123')
    expect(useAuthStore.getState().user).not.toBeNull()

    state.logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
