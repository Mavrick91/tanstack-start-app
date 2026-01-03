// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from '@/test/test-utils'

// Mock state that can be changed per test
const mockLoginMutate = vi.fn()
const mockNavigate = vi.fn()
const mockClose = vi.fn()
const mockSetView = vi.fn()

let mockLoginState = {
  isPending: false,
  error: null as Error | string | null,
}

let mockModalState = {
  returnUrl: undefined as string | undefined,
}

vi.mock('../../../hooks/useAuth', () => ({
  useAuthLogin: () => ({
    mutate: mockLoginMutate,
    get isPending() {
      return mockLoginState.isPending
    },
    get error() {
      return mockLoginState.error
    },
    isError: mockLoginState.error !== null,
    isIdle: false,
    isSuccess: false,
    data: undefined,
    failureCount: 0,
    failureReason: null,
    status: 'idle',
    reset: vi.fn(),
    variables: undefined,
    context: undefined,
    submittedAt: 0,
    isPaused: false,
  }),
}))

vi.mock('../hooks/useAuthModal', () => ({
  useAuthModal: () => ({
    close: mockClose,
    setView: mockSetView,
    get returnUrl() {
      return mockModalState.returnUrl
    },
    isOpen: true,
    view: 'login' as const,
    open: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockLoginState = {
      isPending: false,
      error: null,
    }
    mockModalState = {
      returnUrl: undefined,
    }
  })

  describe('Rendering', () => {
    it('should render email and password fields', () => {
      render(<LoginForm />)

      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('********')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<LoginForm />)

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeInTheDocument()
    })

    it('should render forgot password link', () => {
      render(<LoginForm />)

      expect(
        screen.getByRole('button', { name: /forgot your password/i }),
      ).toBeInTheDocument()
    })

    it('should have correct input types', () => {
      render(<LoginForm />)

      expect(screen.getByPlaceholderText('you@example.com')).toHaveAttribute(
        'type',
        'email',
      )
      expect(screen.getByPlaceholderText('********')).toHaveAttribute(
        'type',
        'password',
      )
    })

    it('should display field labels', () => {
      render(<LoginForm />)

      expect(screen.getByText(/^Email$/)).toBeInTheDocument()
      expect(screen.getByText(/^Password$/)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call loginMutation with form values', async () => {
      const { user } = render(<LoginForm />)

      await user.type(
        screen.getByPlaceholderText('you@example.com'),
        'test@example.com',
      )
      await user.type(screen.getByPlaceholderText('********'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLoginMutate).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
          },
          expect.any(Object),
        )
      })
    })

    it('should close modal on successful login', async () => {
      mockLoginMutate.mockImplementation((_, options) => {
        options.onSuccess()
      })

      const { user } = render(<LoginForm />)

      await user.type(
        screen.getByPlaceholderText('you@example.com'),
        'test@example.com',
      )
      await user.type(screen.getByPlaceholderText('********'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockClose).toHaveBeenCalled()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to returnUrl on successful login', async () => {
      // Set returnUrl for this test
      mockModalState.returnUrl = '/checkout/payment'

      mockLoginMutate.mockImplementation((_, options) => {
        options.onSuccess()
      })

      const { user } = render(<LoginForm />)

      await user.type(
        screen.getByPlaceholderText('you@example.com'),
        'test@example.com',
      )
      await user.type(screen.getByPlaceholderText('********'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/checkout/payment',
        })
      })
    })

    it('should not navigate when no returnUrl', async () => {
      mockLoginMutate.mockImplementation((_, options) => {
        options.onSuccess()
      })

      const { user } = render(<LoginForm />)

      await user.type(
        screen.getByPlaceholderText('you@example.com'),
        'test@example.com',
      )
      await user.type(screen.getByPlaceholderText('********'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockClose).toHaveBeenCalled()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading text when pending', () => {
      mockLoginState.isPending = true

      render(<LoginForm />)

      expect(
        screen.getByRole('button', { name: /signing in\.\.\./i }),
      ).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when login fails', () => {
      mockLoginState.error = new Error('Invalid credentials')

      render(<LoginForm />)

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    it('should show generic error for non-Error objects', () => {
      mockLoginState.error = 'Some error'

      render(<LoginForm />)

      expect(screen.getByText('Login failed')).toBeInTheDocument()
    })

    it('should display error in red background', () => {
      mockLoginState.error = new Error('Test error')

      render(<LoginForm />)

      const errorDiv = screen.getByText('Test error').closest('div')
      expect(errorDiv).toHaveClass('bg-red-50')
      expect(errorDiv).toHaveClass('text-red-600')
    })
  })

  describe('Forgot Password', () => {
    it('should switch to forgot password view when clicked', async () => {
      const { user } = render(<LoginForm />)

      await user.click(
        screen.getByRole('button', { name: /forgot your password/i }),
      )

      expect(mockSetView).toHaveBeenCalledWith('forgot-password')
    })
  })
})
