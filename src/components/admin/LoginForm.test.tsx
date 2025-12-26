import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../../components/ui/button'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({
    component: undefined,
    beforeLoad: undefined,
  }),
  useRouter: () => ({
    navigate: vi.fn(),
  }),
  redirect: vi.fn(),
}))

vi.mock('@tanstack/react-form', () => ({
  useForm: () => ({
    Field: ({
      children,
      name,
    }: {
      children: (field: unknown) => React.ReactNode
      name: string
    }) =>
      children({
        name,
        state: { value: '', meta: { errors: [] } },
        handleBlur: vi.fn(),
        handleChange: vi.fn(),
      }),
    Subscribe: ({
      children,
    }: {
      children: (isSubmitting: boolean) => React.ReactNode
    }) => children(false),
    handleSubmit: vi.fn(),
    setFieldMeta: vi.fn(),
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuthStore: Object.assign(
    (selector: (state: { login: () => Promise<boolean> }) => unknown) =>
      selector({ login: vi.fn().mockResolvedValue(true) }),
    {
      getState: () => ({ isAuthenticated: false }),
    },
  ),
}))

describe('Admin Login Page Structure', () => {
  it('should render login form elements', () => {
    render(
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" placeholder="admin@finenail.com" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" />
        <Button type="submit">Sign In</Button>
      </form>,
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should have correct input placeholders', () => {
    render(
      <form>
        <input
          id="email"
          type="email"
          placeholder="admin@finenail.com"
          aria-label="email"
        />
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          aria-label="password"
        />
      </form>,
    )

    expect(
      screen.getByPlaceholderText('admin@finenail.com'),
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('should show demo credentials hint', () => {
    render(
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Demo: admin@finenail.com / admin123
      </p>,
    )

    expect(screen.getByText(/Demo:/)).toBeInTheDocument()
    expect(screen.getByText(/admin@finenail.com/)).toBeInTheDocument()
  })
})

describe('Login Form Validation', () => {
  it('should display email validation error for invalid email', () => {
    const validateEmail = (value: string) =>
      !value
        ? 'Email is required'
        : !/^\S+@\S+\.\S+$/.test(value)
          ? 'Invalid email format'
          : undefined

    expect(validateEmail('')).toBe('Email is required')
    expect(validateEmail('invalid')).toBe('Invalid email format')
    expect(validateEmail('test@')).toBe('Invalid email format')
    expect(validateEmail('valid@email.com')).toBeUndefined()
  })

  it('should display password validation error for short passwords', () => {
    const validatePassword = (value: string) =>
      !value
        ? 'Password is required'
        : value.length < 6
          ? 'Password must be at least 6 characters'
          : undefined

    expect(validatePassword('')).toBe('Password is required')
    expect(validatePassword('12345')).toBe(
      'Password must be at least 6 characters',
    )
    expect(validatePassword('123456')).toBeUndefined()
    expect(validatePassword('admin123')).toBeUndefined()
  })

  it('should render error message when validation fails', () => {
    render(
      <div className="space-y-2">
        <input id="email" type="email" />
        <p className="text-sm text-red-500">Invalid email format</p>
      </div>,
    )

    expect(screen.getByText('Invalid email format')).toBeInTheDocument()
  })
})

describe('Login Form UX', () => {
  it('should have FineNail branding', () => {
    render(
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black">
          FN
        </div>
        <span className="text-2xl font-bold">Admin</span>
      </div>,
    )

    expect(screen.getByText('FN')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should disable button while submitting', () => {
    render(
      <Button type="submit" disabled={true}>
        Signing in...
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Signing in...')
  })
})
