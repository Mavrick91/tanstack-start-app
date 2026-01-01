import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock server functions
vi.mock('../server/auth', () => ({
  loginFn: vi.fn(),
  logoutFn: vi.fn(),
  getMeFn: vi.fn(),
}))

import { useAuthStore } from './useAuth'
import { loginFn, logoutFn } from '../server/auth'

import { act } from '@/test/test-utils'

describe('Auth Guard Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const mockUser = {
      id: '1',
      email: 'admin@finenail.com',
      role: 'admin',
    }

    vi.mocked(loginFn).mockResolvedValue({
      user: mockUser,
    })

    const state = useAuthStore.getState()
    const result = await state.login('admin@finenail.com', 'admin123')

    expect(result.success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should provide user info after login', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@finenail.com',
      role: 'admin',
    }

    vi.mocked(loginFn).mockResolvedValue({
      user: mockUser,
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
    const mockUser = {
      id: '1',
      email: 'admin@finenail.com',
      role: 'admin',
    }

    vi.mocked(loginFn).mockResolvedValue({
      user: mockUser,
    })

    const state = useAuthStore.getState()
    await state.login('admin@finenail.com', 'admin123')
    expect(useAuthStore.getState().user).not.toBeNull()

    // Mock logout response
    vi.mocked(logoutFn).mockResolvedValue({
      success: true,
    })

    // Logout
    await state.logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
