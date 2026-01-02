import { vi } from 'vitest'

type TranslationFn = (key: string, options?: Record<string, unknown>) => string

export const createMockT = (
  translations?: Record<string, string>,
): TranslationFn => {
  return (key: string) => translations?.[key] ?? key
}

/**
 * Mock react-i18next module.
 *
 * Usage:
 * ```ts
 * vi.mock('react-i18next', () => mockI18n())
 *
 * // With custom translations:
 * vi.mock('react-i18next', () => mockI18n({
 *   'cart.empty': 'Your cart is empty',
 *   'cart.checkout': 'Checkout'
 * }))
 * ```
 */
export const mockI18n = (translations?: Record<string, string>) => ({
  useTranslation: () => ({
    t: createMockT(translations),
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
})
