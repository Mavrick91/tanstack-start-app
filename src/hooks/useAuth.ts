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

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    try {
      const result = await loginFn({ data: { email, password } })
      set({
        isAuthenticated: true,
        user: result.user,
      })
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      // Extract error message from json response or fallback
      const message = error instanceof Error ? error.message : 'Login failed'
      return { success: false, error: message }
    }
  },

  logout: async () => {
    try {
      await logoutFn()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ isAuthenticated: false, user: null })
    }
  },

  checkSession: async () => {
    try {
      set({ isLoading: true })
      const user = await getMeFn()

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
    } catch (error) {
      console.error('Session check failed:', error)
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      })
    }
  },
}))
