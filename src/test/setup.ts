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
    const href = params?.lang ? to.replace('$lang', params.lang) : to
    return React.createElement('a', { href, className }, children)
  },
  useNavigate: () => vi.fn(),
  useParams: () => ({ lang: 'en' }),
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  useRouter: () => ({ navigate: vi.fn() }),
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
// Console warning suppression (optional)
// =============================================================================
const originalError = console.error
console.error = (...args: unknown[]) => {
  // Suppress React act() warnings in async tests - these are often false positives
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
    return
  }
  originalError(...args)
}
