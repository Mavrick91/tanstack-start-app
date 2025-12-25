import { describe, expect, it } from 'vitest'

import { useAuthStore } from './useAuth'

describe('Auth Guard Logic', () => {
  it('should return isAuthenticated false when not logged in', () => {
    const state = useAuthStore.getState()
    // Ensure logged out first
    state.logout()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('should return isAuthenticated true after login', async () => {
    const state = useAuthStore.getState()
    state.logout() // Reset

    const success = await state.login('admin@finenail.com', 'admin123')

    expect(success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should provide user info after login', async () => {
    const state = useAuthStore.getState()
    state.logout() // Reset

    await state.login('admin@finenail.com', 'admin123')

    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    expect(user?.email).toBe('admin@finenail.com')
    expect(user?.name).toBe('Admin User')
  })

  it('should clear user info after logout', async () => {
    const state = useAuthStore.getState()

    // Login first
    await state.login('admin@finenail.com', 'admin123')
    expect(useAuthStore.getState().user).not.toBeNull()

    // Then logout
    state.logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
