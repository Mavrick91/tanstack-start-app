import { create } from 'zustand'

type AuthView = 'login' | 'register' | 'forgot-password'

type AuthModalState = {
  isOpen: boolean
  view: AuthView
  returnUrl: string | undefined
  open: (view?: AuthView, returnUrl?: string) => void
  close: () => void
  setView: (view: AuthView) => void
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  view: 'login',
  returnUrl: undefined,
  open: (view = 'login', returnUrl?: string) =>
    set({ isOpen: true, view, returnUrl }),
  close: () => set({ isOpen: false, returnUrl: undefined }),
  setView: (view) => set({ view }),
}))
