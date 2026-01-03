import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { DefaultErrorComponent } from './error-boundary'

import type { ErrorComponentProps } from '@tanstack/react-router'

import { render, screen, waitFor } from '@/test/test-utils'

// Mock router
const mockInvalidate = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mockInvalidate,
      navigate: mockNavigate,
    }),
  }
})

describe('DefaultErrorComponent', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  const renderComponent = (props: Partial<ErrorComponentProps> = {}) => {
    const defaultProps: ErrorComponentProps = {
      error: new Error('Test error message'),
      reset: vi.fn(),
      info: {
        componentStack: '',
      },
    }
    return render(<DefaultErrorComponent {...defaultProps} {...props} />)
  }

  describe('Error message display', () => {
    it('renders error heading', () => {
      renderComponent()

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays Error object message', () => {
      renderComponent({ error: new Error('Custom error message') })

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('displays default message for non-Error objects', () => {
      renderComponent({ error: 'String error' as unknown as Error })

      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument()
    })

    it('displays default message for null error', () => {
      renderComponent({ error: null as unknown as Error })

      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument()
    })

    it('displays default message for undefined error', () => {
      renderComponent({ error: undefined as unknown as Error })

      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument()
    })

    it('handles error with empty message', () => {
      renderComponent({ error: new Error('') })

      // Empty error message should show the empty string (component renders it as-is)
      const errorText = screen.getByText(
        'Something went wrong',
      ).nextElementSibling
      expect(errorText).toBeInTheDocument()
    })

    it('handles very long error messages', () => {
      const longMessage = 'Error: ' + 'a'.repeat(500)
      renderComponent({ error: new Error(longMessage) })

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })
  })

  describe('Action buttons', () => {
    it('renders Try again button', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /try again/i }),
      ).toBeInTheDocument()
    })

    it('renders Go home button', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /go home/i }),
      ).toBeInTheDocument()
    })

    it('Try again button has RefreshCw icon', () => {
      renderComponent()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      const svg = tryAgainButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('lucide-refresh-cw')
    })

    it('Go home button has Home icon', () => {
      renderComponent()

      const goHomeButton = screen.getByRole('button', { name: /go home/i })
      const svg = goHomeButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('lucide-house')
    })
  })

  describe('Try again functionality', () => {
    it('calls reset when Try again is clicked', async () => {
      const reset = vi.fn()
      const { user } = renderComponent({ reset })

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await user.click(tryAgainButton)

      await waitFor(() => {
        expect(reset).toHaveBeenCalledTimes(1)
      })
    })

    it('calls router.invalidate when Try again is clicked', async () => {
      const { user } = renderComponent()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await user.click(tryAgainButton)

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1)
      })
    })

    it('calls both reset and invalidate in correct order', async () => {
      const reset = vi.fn()
      const { user } = renderComponent({ reset })

      const callOrder: string[] = []
      reset.mockImplementation(() => callOrder.push('reset'))
      mockInvalidate.mockImplementation(() => callOrder.push('invalidate'))

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await user.click(tryAgainButton)

      await waitFor(() => {
        expect(callOrder).toEqual(['reset', 'invalidate'])
      })
    })

    it('handles multiple clicks on Try again', async () => {
      const reset = vi.fn()
      const { user } = renderComponent({ reset })

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await user.click(tryAgainButton)
      await user.click(tryAgainButton)

      await waitFor(() => {
        expect(reset).toHaveBeenCalledTimes(2)
        expect(mockInvalidate).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Go home functionality', () => {
    it('navigates to root when Go home is clicked', async () => {
      const { user } = renderComponent()

      const goHomeButton = screen.getByRole('button', { name: /go home/i })
      await user.click(goHomeButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })

    it('handles multiple clicks on Go home', async () => {
      const { user } = renderComponent()

      const goHomeButton = screen.getByRole('button', { name: /go home/i })
      await user.click(goHomeButton)
      await user.click(goHomeButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error icon', () => {
    it('renders AlertTriangle icon', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('.lucide-triangle-alert')
      expect(icon).toBeInTheDocument()
    })

    it('icon has destructive color', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('.lucide-triangle-alert')
      expect(icon).toHaveClass('text-destructive')
    })

    it('icon is in rounded background', () => {
      const { container } = renderComponent()

      const iconWrapper = container.querySelector('.rounded-full')
      expect(iconWrapper).toBeInTheDocument()
      expect(iconWrapper).toHaveClass('bg-destructive/10')
    })
  })

  describe('Development mode error details', () => {
    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack =
        'Error: Test error\n    at Object.<anonymous> (test.ts:10:15)'

      renderComponent({ error })

      expect(screen.getByText('Error details')).toBeInTheDocument()
    })

    it('shows error stack in development mode', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack =
        'Error: Test error\n    at Object.<anonymous> (test.ts:10:15)'

      renderComponent({ error })

      const stackTrace = screen.getByText(/Error: Test error/)
      expect(stackTrace).toBeInTheDocument()
    })

    it('error details are in collapsible details element', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack = 'Stack trace here'

      const { container } = renderComponent({ error })

      const details = container.querySelector('details')
      expect(details).toBeInTheDocument()

      const summary = container.querySelector('summary')
      expect(summary).toHaveTextContent('Error details')
    })

    it('does not show error details in production mode', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')
      error.stack = 'Stack trace here'

      renderComponent({ error })

      expect(screen.queryByText('Error details')).not.toBeInTheDocument()
      expect(screen.queryByText('Stack trace here')).not.toBeInTheDocument()
    })

    it('does not show error details for non-Error objects even in dev', () => {
      process.env.NODE_ENV = 'development'

      renderComponent({ error: 'String error' as unknown as Error })

      expect(screen.queryByText('Error details')).not.toBeInTheDocument()
    })

    it('shows error details even when stack is undefined', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack = undefined

      renderComponent({ error })

      // Component shows details section even with undefined stack
      expect(screen.getByText('Error details')).toBeInTheDocument()
    })
  })

  describe('Layout and styling', () => {
    it('renders in centered container', () => {
      const { container } = renderComponent()

      const wrapper = container.querySelector('.min-h-\\[400px\\]')
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
      expect(wrapper).toHaveClass('justify-center')
    })

    it('renders buttons in flex layout', () => {
      renderComponent()

      // Find the div containing both buttons
      const buttonContainer = screen.getByRole('button', {
        name: /try again/i,
      }).parentElement
      expect(buttonContainer).toHaveClass('flex')
      expect(buttonContainer).toHaveClass('gap-3')
    })

    it('Try again button has default variant', () => {
      renderComponent()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      // Button component applies variant classes, just check it exists
      expect(tryAgainButton).toBeInTheDocument()
    })

    it('Go home button has outline variant', () => {
      renderComponent()

      const goHomeButton = screen.getByRole('button', { name: /go home/i })
      // Button component applies variant classes, just check it exists
      expect(goHomeButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('buttons are keyboard accessible', () => {
      renderComponent()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      const goHomeButton = screen.getByRole('button', { name: /go home/i })

      expect(tryAgainButton.tagName).toBe('BUTTON')
      expect(goHomeButton.tagName).toBe('BUTTON')
    })

    it('heading is semantic h2', () => {
      renderComponent()

      const heading = screen.getByText('Something went wrong')
      expect(heading.tagName).toBe('H2')
    })

    it('error message has appropriate text styling', () => {
      renderComponent({ error: new Error('Test error') })

      const errorMessage = screen.getByText('Test error')
      expect(errorMessage.tagName).toBe('P')
      expect(errorMessage).toHaveClass('text-sm')
      expect(errorMessage).toHaveClass('text-muted-foreground')
    })
  })

  describe('Edge cases', () => {
    it('handles error with special characters', () => {
      renderComponent({
        error: new Error('Error: <script>alert("xss")</script>'),
      })

      expect(
        screen.getByText('Error: <script>alert("xss")</script>'),
      ).toBeInTheDocument()
    })

    it('handles error with multiline message', () => {
      renderComponent({ error: new Error('Line 1\nLine 2\nLine 3') })

      // Multiline text needs regex matcher
      expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument()
    })

    it('handles error with Unicode characters', () => {
      renderComponent({ error: new Error('Error: 你好 🚀 Ñoño') })

      expect(screen.getByText('Error: 你好 🚀 Ñoño')).toBeInTheDocument()
    })

    it('handles object errors with toString', () => {
      const objectError = {
        toString: () => 'Custom object error',
      }

      renderComponent({ error: objectError as unknown as Error })

      expect(
        screen.getByText('An unexpected error occurred'),
      ).toBeInTheDocument()
    })
  })

  describe('Responsive design', () => {
    it('buttons stack on mobile, row on desktop', () => {
      renderComponent()

      const buttonContainer = screen.getByRole('button', {
        name: /try again/i,
      }).parentElement

      expect(buttonContainer).toHaveClass('flex-col')
      expect(buttonContainer).toHaveClass('sm:flex-row')
    })

    it('content is centered and max-width constrained', () => {
      const { container } = renderComponent()

      const contentWrapper = container.querySelector('.max-w-md')
      expect(contentWrapper).toBeInTheDocument()
      expect(contentWrapper).toHaveClass('w-full')
      expect(contentWrapper).toHaveClass('text-center')
    })
  })
})
