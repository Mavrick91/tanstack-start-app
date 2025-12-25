import { create } from 'zustand'

type User = {
  id: string
  email: string
  role: string
}

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for cookies
      })

      const result = await response.json()

      if (result.success && result.user) {
        set({
          isAuthenticated: true,
          user: result.user,
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ isAuthenticated: false, user: null })
    }
  },

  checkSession: async () => {
    try {
      set({ isLoading: true })
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success && result.user) {
        set({
          isAuthenticated: true,
          user: result.user,
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
