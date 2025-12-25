import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  email: string
  name: string
}

type AuthState = {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

// Mock credentials for demo purposes
const MOCK_CREDENTIALS = {
  email: 'admin@finenail.com',
  password: 'admin123',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      login: async (email: string, password: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (
          email === MOCK_CREDENTIALS.email &&
          password === MOCK_CREDENTIALS.password
        ) {
          set({
            isAuthenticated: true,
            user: { email, name: 'Admin User' },
          })
          return true
        }
        return false
      },

      logout: () => {
        set({ isAuthenticated: false, user: null })
      },
    }),
    { name: 'auth-storage' },
  ),
)
