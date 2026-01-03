import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AuthForm } from './AuthForm'

import { render, screen, waitFor } from '@/test/test-utils'

// Mock the child components
vi.mock('./LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}))

vi.mock('./RegisterForm', () => ({
  RegisterForm: () => <div data-testid="register-form">Register Form</div>,
}))

vi.mock('./ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => (
    <div data-testid="forgot-password-form">Forgot Password Form</div>
  ),
}))

vi.mock('./GoogleButton', () => ({
  GoogleButton: ({ returnUrl }: { returnUrl?: string }) => (
    <div data-testid="google-button" data-return-url={returnUrl}>
      Google Button
    </div>
  ),
}))

// Mock the useAuthModal hook
const mockSetView = vi.fn()
const mockUseAuthModal = vi.fn()

vi.mock('../hooks/useAuthModal', () => ({
  useAuthModal: () => mockUseAuthModal(),
}))

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    mockUseAuthModal.mockReturnValue({
      view: null,
      setView: mockSetView,
      returnUrl: null,
    })
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AuthForm>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof AuthForm> = {
      defaultView: 'login',
    }
    return render(<AuthForm {...defaultProps} {...props} />)
  }

  describe('Default view behavior', () => {
    it('shows login form by default', () => {
      renderComponent()

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('register-form')).not.toBeInTheDocument()
    })

    it('shows register form when defaultView is register', () => {
      renderComponent({ defaultView: 'register' })

      // Register tab should be active
      const registerTab = screen.getByRole('tab', { name: /register/i })
      expect(registerTab).toHaveAttribute('data-state', 'active')
    })

    it('shows login form when defaultView is login', () => {
      renderComponent({ defaultView: 'login' })

      const loginTab = screen.getByRole('tab', { name: /login/i })
      expect(loginTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('View from hook overrides defaultView', () => {
    it('shows login view when hook returns login', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent({ defaultView: 'register' })

      // Should show login despite defaultView being register
      const loginTab = screen.getByRole('tab', { name: /login/i })
      expect(loginTab).toHaveAttribute('data-state', 'active')
    })

    it('shows register view when hook returns register', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'register',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent({ defaultView: 'login' })

      // Should show register despite defaultView being login
      const registerTab = screen.getByRole('tab', { name: /register/i })
      expect(registerTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('Forgot password view', () => {
    it('shows forgot password form when view is forgot-password', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'forgot-password',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
      expect(screen.getByText('Reset Password')).toBeInTheDocument()
    })

    it('does not show tabs in forgot password view', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'forgot-password',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(
        screen.queryByRole('tab', { name: /login/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('tab', { name: /register/i }),
      ).not.toBeInTheDocument()
    })

    it('does not show Google button in forgot password view', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'forgot-password',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(screen.queryByTestId('google-button')).not.toBeInTheDocument()
    })
  })

  describe('Tab switching', () => {
    it('renders both login and register tabs', () => {
      renderComponent()

      expect(screen.getByRole('tab', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /register/i })).toBeInTheDocument()
    })

    it('calls setView when tab is clicked', async () => {
      const { user } = renderComponent()

      const registerTab = screen.getByRole('tab', { name: /register/i })

      await user.click(registerTab)

      await waitFor(() => {
        expect(mockSetView).toHaveBeenCalledWith('register')
      })
    })

    it('switches from login to register tab', async () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: null,
      })

      const { user } = renderComponent()

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      expect(mockSetView).toHaveBeenCalledWith('register')
    })

    it('switches from register to login tab', async () => {
      mockUseAuthModal.mockReturnValue({
        view: 'register',
        setView: mockSetView,
        returnUrl: null,
      })

      const { user } = renderComponent()

      const loginTab = screen.getByRole('tab', { name: /login/i })
      await user.click(loginTab)

      expect(mockSetView).toHaveBeenCalledWith('login')
    })
  })

  describe('Google OAuth integration', () => {
    it('renders Google button', () => {
      renderComponent()

      expect(screen.getByTestId('google-button')).toBeInTheDocument()
    })

    it('passes returnUrl to Google button when provided', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: '/checkout',
      })

      renderComponent()

      const googleButton = screen.getByTestId('google-button')
      expect(googleButton).toHaveAttribute('data-return-url', '/checkout')
    })

    it('does not pass returnUrl when not provided', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      const googleButton = screen.getByTestId('google-button')
      // When returnUrl is null, component passes undefined which doesn't set the attribute
      expect(googleButton).not.toHaveAttribute('data-return-url')
    })

    it('renders "Or continue with" divider', () => {
      renderComponent()

      expect(screen.getByText('Or continue with')).toBeInTheDocument()
    })
  })

  describe('Component integration', () => {
    it('renders login form in login tab', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
    })

    it('renders register form in register tab', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'register',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })

    it('does not render both forms simultaneously', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent()

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      // Register form should not be visible (Radix tabs hide inactive content)
      expect(screen.queryByTestId('register-form')).not.toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles undefined returnUrl', () => {
      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: undefined,
      })

      renderComponent()

      const googleButton = screen.getByTestId('google-button')
      expect(googleButton).toBeInTheDocument()
    })

    it('handles null view from hook (falls back to defaultView)', () => {
      mockUseAuthModal.mockReturnValue({
        view: null,
        setView: mockSetView,
        returnUrl: null,
      })

      renderComponent({ defaultView: 'register' })

      const registerTab = screen.getByRole('tab', { name: /register/i })
      expect(registerTab).toHaveAttribute('data-state', 'active')
    })

    it('maintains view state when returnUrl changes', () => {
      const { rerender } = renderComponent()

      mockUseAuthModal.mockReturnValue({
        view: 'login',
        setView: mockSetView,
        returnUrl: '/new-url',
      })

      rerender(<AuthForm defaultView="login" />)

      const loginTab = screen.getByRole('tab', { name: /login/i })
      expect(loginTab).toHaveAttribute('data-state', 'active')
    })
  })
})
