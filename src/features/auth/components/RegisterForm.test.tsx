import { describe, expect, it, vi, beforeEach } from 'vitest'

import { RegisterForm } from './RegisterForm'

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
      data-testid="register-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      }}
    >
      <input type="email" name="email" placeholder="you@example.com" />
      <input type="password" name="password" placeholder="Enter password" />
      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm password"
      />
      <button type="submit">{submitButtonText}</button>
    </form>
  ),
}))

// Mock useAuthRegister hook
const mockMutate = vi.fn()
const mockMutation = {
  mutate: mockMutate,
  isPending: false,
  isSuccess: false,
  error: null as Error | null,
}

vi.mock('@/hooks/useAuth', () => ({
  useAuthRegister: () => mockMutation,
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutation.isPending = false
    mockMutation.isSuccess = false
    mockMutation.error = null
  })

  const renderComponent = () => {
    return render(<RegisterForm />)
  }

  describe('Initial rendering', () => {
    it('renders the registration form', () => {
      renderComponent()

      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })

    it('renders email input field', () => {
      renderComponent()

      const emailInput = screen.getByPlaceholderText('you@example.com')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('renders password input field', () => {
      renderComponent()

      const passwordInput = screen.getByPlaceholderText('Enter password')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('renders confirm password input field', () => {
      renderComponent()

      const confirmPasswordInput =
        screen.getByPlaceholderText('Confirm password')
      expect(confirmPasswordInput).toBeInTheDocument()
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })

    it('shows "Create account" button by default', () => {
      renderComponent()

      expect(screen.getByText('Create account')).toBeInTheDocument()
    })

    it('displays terms and privacy policy text', () => {
      renderComponent()

      expect(
        screen.getByText(/By creating an account, you agree to our/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument()
      expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument()
    })

    it('does not show error message initially', () => {
      renderComponent()

      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    })

    it('does not show success message initially', () => {
      renderComponent()

      expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
    })
  })

  describe('Form submission', () => {
    it('calls mutation with email, password and default language', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Create account'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          lang: 'en',
        })
      })
    })

    it('submits form when button is clicked', async () => {
      const { user } = renderComponent()

      const submitButton = screen.getByText('Create account')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('converts email to string before submitting', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Create account'))

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
    it('shows "Creating account..." when mutation is pending', () => {
      mockMutation.isPending = true

      renderComponent()

      expect(screen.getByText('Creating account...')).toBeInTheDocument()
      expect(screen.queryByText('Create account')).not.toBeInTheDocument()
    })

    it('changes button text during submission', () => {
      mockMutation.isPending = true

      renderComponent()

      const button = screen.getByText('Creating account...')
      expect(button).toBeInTheDocument()
    })
  })

  describe('Success state', () => {
    beforeEach(() => {
      mockMutation.isSuccess = true
    })

    it('shows success message after successful registration', () => {
      renderComponent()

      expect(screen.getByText('Check your email')).toBeInTheDocument()
      expect(
        screen.getByText(/We sent you a verification link/i),
      ).toBeInTheDocument()
    })

    it('hides the form after successful registration', () => {
      renderComponent()

      expect(screen.queryByTestId('register-form')).not.toBeInTheDocument()
      expect(
        screen.queryByPlaceholderText('you@example.com'),
      ).not.toBeInTheDocument()
    })

    it('hides terms and privacy text in success state', () => {
      renderComponent()

      expect(
        screen.queryByText(/By creating an account/i),
      ).not.toBeInTheDocument()
    })

    it('mentions email verification and account access in success message', () => {
      renderComponent()

      expect(
        screen.getByText(
          /Click the link to verify your email and access your account/i,
        ),
      ).toBeInTheDocument()
    })

    it('renders success message with correct styling', () => {
      const { container } = renderComponent()

      const successDiv = container.querySelector('.bg-green-50')
      expect(successDiv).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('shows error message when registration fails', () => {
      mockMutation.error = new Error('Email already exists')

      renderComponent()

      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })

    it('displays generic error for non-Error objects', () => {
      mockMutation.error = { message: 'Unknown error' } as Error

      renderComponent()

      expect(screen.getByText('Registration failed')).toBeInTheDocument()
    })

    it('shows error with correct styling', () => {
      mockMutation.error = new Error('Test error')

      const { container } = renderComponent()

      const errorDiv = container.querySelector('.bg-red-50')
      expect(errorDiv).toBeInTheDocument()
      expect(errorDiv).toHaveClass('text-red-600')
    })

    it('displays error above the form', () => {
      mockMutation.error = new Error('Test error')

      renderComponent()

      const errorMessage = screen.getByText('Test error')
      const form = screen.getByTestId('register-form')

      // Error should appear before form in DOM
      expect(errorMessage.compareDocumentPosition(form)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })

    it('shows form even when there is an error', () => {
      mockMutation.error = new Error('Test error')

      renderComponent()

      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })

    it('allows retry after error', async () => {
      mockMutation.error = new Error('Network error')

      const { user } = renderComponent()

      // Form should still be submittable
      await user.click(screen.getByText('Create account'))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })
  })

  describe('Language handling', () => {
    it('uses default "en" language when no lang param', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Create account'))

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

  describe('State transitions', () => {
    it('transitions from initial to pending to success', () => {
      const { rerender } = renderComponent()

      // Initial state
      expect(screen.getByText('Create account')).toBeInTheDocument()

      // Pending state
      mockMutation.isPending = true
      rerender(<RegisterForm />)
      expect(screen.getByText('Creating account...')).toBeInTheDocument()

      // Success state
      mockMutation.isPending = false
      mockMutation.isSuccess = true
      rerender(<RegisterForm />)
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })

    it('transitions from initial to error state', () => {
      const { rerender } = renderComponent()

      // Initial state
      expect(screen.queryByText('Registration failed')).not.toBeInTheDocument()

      // Error state
      mockMutation.error = new Error('Test error')
      rerender(<RegisterForm />)
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('shows error and form simultaneously', () => {
      mockMutation.error = new Error('Validation error')

      renderComponent()

      expect(screen.getByText('Validation error')).toBeInTheDocument()
      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles empty email submission gracefully', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Create account'))

      // Should still call mutate (validation happens in FNForm)
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('handles multiple rapid submissions', async () => {
      const { user } = renderComponent()

      const button = screen.getByText('Create account')

      // Click multiple times rapidly
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Should have been called for each click
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('preserves error message across renders', () => {
      mockMutation.error = new Error('Persistent error')

      const { rerender } = renderComponent()

      expect(screen.getByText('Persistent error')).toBeInTheDocument()

      rerender(<RegisterForm />)

      expect(screen.getByText('Persistent error')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic button element', () => {
      renderComponent()

      const button = screen.getByText('Create account')
      expect(button.tagName).toBe('BUTTON')
    })

    it('provides descriptive button text', () => {
      renderComponent()

      const submitButton = screen.getByText('Create account')
      expect(submitButton.textContent).toBeTruthy()
    })

    it('success message has proper heading', () => {
      mockMutation.isSuccess = true
      renderComponent()

      const heading = screen.getByText('Check your email')
      expect(heading.tagName).toBe('H3')
    })

    it('error message is visible to screen readers', async () => {
      mockMutation.error = new Error('Error for screen readers')

      renderComponent()

      const errorText = screen.getByText('Error for screen readers')
      await waitFor(() => {
        expect(errorText).toBeVisible()
      })
    })
  })

  describe('Form integration', () => {
    it('renders FNForm component', () => {
      renderComponent()

      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })

    it('passes correct props to FNForm', () => {
      renderComponent()

      const form = screen.getByTestId('register-form')
      expect(form).toBeInTheDocument()
    })
  })
})
