import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  id: string
  email: string
  name: string
  role: string
}

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      login: async (email, password) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
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

      logout: () => {
        set({ isAuthenticated: false, user: null })
      },
    }),
    { name: 'auth-storage' },
  ),
)
