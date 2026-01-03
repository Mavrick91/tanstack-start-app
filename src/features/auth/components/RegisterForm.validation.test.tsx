import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { RegisterForm } from './RegisterForm'

import { render, screen, waitFor } from '@/test/test-utils'

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

describe('RegisterForm Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutation.isPending = false
    mockMutation.isSuccess = false
    mockMutation.error = null
  })

  it('shows error for weak password (less than 8 characters)', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await user.type(screen.getAllByPlaceholderText('********')[0], 'Test123')
    await user.type(screen.getAllByPlaceholderText('********')[1], 'Test123')

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows error for password without number', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[0],
      'TestPassword',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[1],
      'TestPassword',
    )

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/password must contain at least one number/i),
      ).toBeInTheDocument()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows error for mismatched passwords', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[0],
      'TestPassword123!',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[1],
      'DifferentPassword123!',
    )

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows error for empty email', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getAllByPlaceholderText('********')[0],
      'TestPassword123!',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[1],
      'TestPassword123!',
    )

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email.*required|required/i)).toBeInTheDocument()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows error for empty password', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/^Password is required$/i)).toBeInTheDocument()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'invalid-email',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[0],
      'TestPassword123!',
    )
    await user.type(
      screen.getAllByPlaceholderText('********')[1],
      'TestPassword123!',
    )

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email address/i),
      ).toBeInTheDocument()
    })
  })
})
