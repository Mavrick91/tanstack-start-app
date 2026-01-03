import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactElement } from 'react'

/**
 * Create a fresh QueryClient for each test.
 * This ensures no state leaks between tests.
 */
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Default wrapper component with common providers.
 * Includes QueryClientProvider by default.
 *
 * Note: RouterProvider is NOT included because:
 * - We mock router hooks globally in setup.ts for unit testing
 * - Adding RouterProvider would require defining routes for every test
 * - Unit tests should test components in isolation
 * - Integration/E2E tests should use full router context
 */
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Optional custom wrapper. Will be composed with AllProviders.
   * If you need full control, use the original render from @testing-library/react.
   */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
}

/**
 * Custom render that includes:
 * - QueryClientProvider wrapper (fresh client per render)
 * - Pre-configured userEvent instance
 *
 * Usage:
 * ```tsx
 * const { user } = render(<MyComponent />)
 * await user.click(screen.getByRole('button'))
 * ```
 *
 * With custom wrapper:
 * ```tsx
 * const { user } = render(<MyComponent />, {
 *   wrapper: ({ children }) => <CustomProvider>{children}</CustomProvider>
 * })
 * ```
 */
const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { wrapper: CustomWrapper, ...restOptions } = options || {}

  // Compose wrappers if custom wrapper is provided
  const FinalWrapper = CustomWrapper
    ? ({ children }: { children: React.ReactNode }) => (
        <AllProviders>
          <CustomWrapper>{children}</CustomWrapper>
        </AllProviders>
      )
    : AllProviders

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: FinalWrapper, ...restOptions }),
  }
}

// Re-export everything from RTL
export * from '@testing-library/react'

// Override render with custom version
export { customRender as render }

// Re-export userEvent for cases where manual setup is needed
export { default as userEvent } from '@testing-library/user-event'

// Export helper for tests that need a custom QueryClient
export { createTestQueryClient }
