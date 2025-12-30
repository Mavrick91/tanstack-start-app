import React from 'react'
import { vi } from 'vitest'

/**
 * Creates a mock navigate function for testing.
 */
export const createMockNavigate = () => vi.fn()

/**
 * Creates a mock useParams hook return value.
 */
export const createMockParams = (
  params: Record<string, string> = { lang: 'en' },
) => {
  return () => params
}

/**
 * Mock TanStack Router module.
 *
 * Usage:
 * ```ts
 * vi.mock('@tanstack/react-router', () => mockRouter())
 *
 * // With custom navigate mock for assertions:
 * const navigate = createMockNavigate()
 * vi.mock('@tanstack/react-router', () => mockRouter({ useNavigate: () => navigate }))
 * ```
 */
export const mockRouter = (overrides: Record<string, unknown> = {}) => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string | Record<string, unknown>
    [key: string]: unknown
  }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => createMockNavigate(),
  useParams: createMockParams(),
  useRouter: () => ({
    state: {
      location: {
        pathname: '/',
        search: '',
        hash: '',
      },
    },
  }),
  useMatch: () => undefined,
  useSearch: () => ({}),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
  }),
  ...overrides,
})
