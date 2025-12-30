import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactElement } from 'react'

/**
 * Wrapper component for common providers.
 * Extend this as needed (e.g., add ThemeProvider, QueryClientProvider).
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * Custom render that includes:
 * - Common providers wrapper
 * - Pre-configured userEvent instance
 *
 * Usage:
 * ```tsx
 * const { user } = render(<MyComponent />)
 * await user.click(screen.getByRole('button'))
 * ```
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  }
}

// Re-export everything from RTL
export * from '@testing-library/react'

// Override render with custom version
export { customRender as render }

// Re-export userEvent for cases where manual setup is needed
export { default as userEvent } from '@testing-library/user-event'
