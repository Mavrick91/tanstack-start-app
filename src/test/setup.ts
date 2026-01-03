import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, vi } from 'vitest'

import { resetFactories } from './factories/data'

// Initialize i18n
import '../lib/i18n'

// =============================================================================
// Global Mocks - Router
// =============================================================================

/**
 * Shared mock for useNavigate - import this in tests to assert on navigation calls.
 *
 * Usage:
 * ```ts
 * import { mockNavigate } from '@/test/setup'
 *
 * expect(mockNavigate).toHaveBeenCalledWith({ to: '/$lang/account', params: { lang: 'en' } })
 * ```
 */
export const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
    className?: string
  }) => {
    let href = to
    // Replace all $param placeholders with their values
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        href = href.replace(`$${key}`, value)
      })
    }
    return React.createElement('a', { href, className }, children)
  },
  useNavigate: () => mockNavigate,
  useParams: () => ({ lang: 'en' }),
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  useRouter: () => ({ navigate: vi.fn() }),
  createFileRoute: () => () => ({}),
}))

// =============================================================================
// Global Mocks - i18n
// =============================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key
      // Simple interpolation for test mocks
      return key.replace(/\{\{(\w+)\}\}/g, (_, param) => String(params[param]))
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

// =============================================================================
// Standardized cleanup after EVERY test
// =============================================================================
afterEach(() => {
  cleanup() // RTL cleanup (unmount components)
  vi.clearAllMocks() // Clear mock call history (keeps implementations)
  resetFactories() // Reset ID counters for consistent tests
})

// =============================================================================
// Zustand store reset helper
// =============================================================================
const storeResetFns = new Set<() => void>()

/**
 * Register a store reset function to be called before each test.
 * Use this in your Zustand stores to ensure clean state between tests.
 *
 * Usage (in store file):
 * ```ts
 * import { registerStoreReset } from '@/test/setup'
 *
 * const initialState = { items: [], ... }
 * export const useCartStore = create(...)
 *
 * if (import.meta.env.MODE === 'test') {
 *   registerStoreReset(() => useCartStore.setState(initialState))
 * }
 * ```
 */
export const registerStoreReset = (resetFn: () => void) => {
  storeResetFns.add(resetFn)
}

beforeEach(() => {
  storeResetFns.forEach((reset) => reset())
})

// =============================================================================
// jsdom polyfills for Radix UI
// =============================================================================

// Mock ResizeObserver for JSDOM (required by Radix UI components)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock pointer capture methods for JSDOM (required by Radix UI Select)
Element.prototype.hasPointerCapture = () => false
Element.prototype.setPointerCapture = () => {}
Element.prototype.releasePointerCapture = () => {}

// Mock scrollIntoView for JSDOM (required by Radix UI Select)
Element.prototype.scrollIntoView = () => {}

// =============================================================================
// Console warning suppression
// =============================================================================
const originalWarn = console.warn
const originalError = console.error

console.warn = (...args: unknown[]) => {
  // Suppress useRouter warnings - this is the correct approach for unit tests
  // We mock router hooks globally for isolated component testing
  // Adding RouterProvider would require defining full route trees for every test
  // Integration/E2E tests should use full RouterProvider context
  if (
    typeof args[0] === 'string' &&
    args[0].includes('useRouter must be used inside a <RouterProvider>')
  ) {
    return
  }
  originalWarn(...args)
}

console.error = (...args: unknown[]) => {
  // Suppress React act() warnings in async tests - these are often false positives
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
    return
  }
  originalError(...args)
}
