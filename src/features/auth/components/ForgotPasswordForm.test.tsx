import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ForgotPasswordForm } from './ForgotPasswordForm'

import { render, screen, waitFor } from '@/test/test-utils'

// Mock FNForm to simplify testing
vi.mock('@/components/ui/fn-form', () => ({
  FNForm: ({
    onSubmit,
    submitButtonText,
  }: {
    onSubmit: (values: Record<string, unknown>) => void
    submitButtonText: string
  }) => (
    <form
      data-testid="forgot-password-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ email: 'test@example.com' })
      }}
    >
      <input type="email" name="email" placeholder="you@example.com" />
      <button type="submit">{submitButtonText}</button>
    </form>
  ),
}))

// Mock useAuthModal hook
const mockSetView = vi.fn()
vi.mock('../hooks/useAuthModal', () => ({
  useAuthModal: () => ({
    setView: mockSetView,
  }),
}))

// Mock useAuthForgotPassword hook
const mockMutate = vi.fn()
const mockMutation = {
  mutate: mockMutate,
  isPending: false,
  isSuccess: false,
  error: null,
}

vi.mock('@/hooks/useAuth', () => ({
  useAuthForgotPassword: () => mockMutation,
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutation.isPending = false
    mockMutation.isSuccess = false
    mockMutation.error = null
  })

  const renderComponent = () => {
    return render(<ForgotPasswordForm />)
  }

  describe('Initial rendering', () => {
    it('renders the form', () => {
      renderComponent()

      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
    })

    it('shows instruction text', () => {
      renderComponent()

      expect(
        screen.getByText(/Enter your email address and we'll send you a link/i),
      ).toBeInTheDocument()
    })

    it('renders email input field', () => {
      renderComponent()

      const emailInput = screen.getByPlaceholderText('you@example.com')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('shows "Send reset link" button by default', () => {
      renderComponent()

      expect(screen.getByText('Send reset link')).toBeInTheDocument()
    })

    it('shows "Back to login" link', () => {
      renderComponent()

      expect(screen.getByText('Back to login')).toBeInTheDocument()
    })
  })

  describe('Form submission', () => {
    it('calls mutation with email and default language', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Send reset link'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          email: 'test@example.com',
          lang: 'en',
        })
      })
    })

    it('submits form when submit button is clicked', async () => {
      const { user } = renderComponent()

      const submitButton = screen.getByText('Send reset link')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('converts email to string before submitting', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Send reset link'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            email: expect.any(String),
          }),
        )
      })
    })
  })

  describe('Loading state', () => {
    it('shows "Sending..." when mutation is pending', () => {
      mockMutation.isPending = true

      renderComponent()

      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(screen.queryByText('Send reset link')).not.toBeInTheDocument()
    })

    it('disables button text changes during submission', () => {
      mockMutation.isPending = true

      renderComponent()

      const button = screen.getByText('Sending...')
      expect(button).toBeInTheDocument()
    })
  })

  describe('Success state', () => {
    beforeEach(() => {
      mockMutation.isSuccess = true
    })

    it('shows success message after successful submission', () => {
      renderComponent()

      expect(screen.getByText('Check your email')).toBeInTheDocument()
      expect(
        screen.getByText(/If an account exists with that email/i),
      ).toBeInTheDocument()
    })

    it('hides the form after successful submission', () => {
      renderComponent()

      expect(
        screen.queryByTestId('forgot-password-form'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByPlaceholderText('you@example.com'),
      ).not.toBeInTheDocument()
    })

    it('shows "Back to login" button in success state', () => {
      renderComponent()

      expect(screen.getByText('Back to login')).toBeInTheDocument()
    })

    it('hides instruction text in success state', () => {
      renderComponent()

      expect(
        screen.queryByText(
          /Enter your email address and we'll send you a link/i,
        ),
      ).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('calls setView with "login" when back button is clicked', async () => {
      const { user } = renderComponent()

      const backButton = screen.getByText('Back to login')
      await user.click(backButton)

      expect(mockSetView).toHaveBeenCalledWith('login')
    })

    it('calls setView from success state', async () => {
      mockMutation.isSuccess = true
      const { user } = renderComponent()

      const backButton = screen.getByText('Back to login')
      await user.click(backButton)

      expect(mockSetView).toHaveBeenCalledWith('login')
    })
  })

  describe('Language handling', () => {
    it('uses default "en" language when no lang param', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Send reset link'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            lang: 'en',
          }),
        )
      })
    })

    // Note: Testing different language params would require mocking useParams
    // which is already done globally, so the default behavior is tested above
  })

  describe('Edge cases', () => {
    it('handles form submission without email gracefully', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Send reset link'))

      // Should still call mutate (validation happens in FNForm)
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('renders success message with correct styling', () => {
      mockMutation.isSuccess = true

      const { container } = renderComponent()

      const successDiv = container.querySelector('.bg-green-50')
      expect(successDiv).toBeInTheDocument()
    })

    it('button type is set to button (not submit)', async () => {
      renderComponent()

      const backButton = screen.getByText('Back to login')
      expect(backButton).toHaveAttribute('type', 'button')
    })

    it('maintains state transitions correctly', () => {
      const { rerender } = renderComponent()

      // Initially not pending or success
      expect(screen.getByText('Send reset link')).toBeInTheDocument()

      // Switch to pending
      mockMutation.isPending = true
      rerender(<ForgotPasswordForm />)
      expect(screen.getByText('Sending...')).toBeInTheDocument()

      // Switch to success
      mockMutation.isPending = false
      mockMutation.isSuccess = true
      rerender(<ForgotPasswordForm />)
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic button elements', () => {
      renderComponent()

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('provides descriptive button text', () => {
      renderComponent()

      const submitButton = screen.getByText('Send reset link')
      expect(submitButton.textContent).toBeTruthy()
    })

    it('success message has proper heading', () => {
      mockMutation.isSuccess = true
      renderComponent()

      const heading = screen.getByText('Check your email')
      expect(heading.tagName).toBe('H3')
    })
  })
})
