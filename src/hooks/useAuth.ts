import { create } from 'zustand'

import { loginFn, logoutFn, getMeFn, type AuthUser } from '../server/auth'

type AuthState = {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

// Request tracking to prevent race conditions
// When multiple concurrent calls are made, only the latest one updates state
let loginRequestId = 0
let sessionRequestId = 0

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    const requestId = ++loginRequestId
    try {
      const result = await loginFn({ data: { email, password } })
      // Only update state if this is still the latest request
      if (requestId === loginRequestId) {
        set({
          isAuthenticated: true,
          user: result.user,
        })
      }
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      // Only update state if this is still the latest request
      if (requestId === loginRequestId) {
        const message = error instanceof Error ? error.message : 'Login failed'
        return { success: false, error: message }
      }
      return { success: false, error: 'Request superseded' }
    }
  },

  logout: async () => {
    // Increment both counters to invalidate any pending requests
    loginRequestId++
    sessionRequestId++
    try {
      await logoutFn()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ isAuthenticated: false, user: null })
    }
  },

  checkSession: async () => {
    const requestId = ++sessionRequestId
    set({ isLoading: true })
    try {
      const user = await getMeFn()

      // Only update state if this is still the latest request
      if (requestId === sessionRequestId) {
        if (user) {
          set({
            isAuthenticated: true,
            user,
            isLoading: false,
          })
        } else {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          })
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      // Only update state if this is still the latest request
      if (requestId === sessionRequestId) {
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      }
    }
  },
}))
