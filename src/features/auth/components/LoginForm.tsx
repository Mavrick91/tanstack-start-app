import { useNavigate } from '@tanstack/react-router'

import { useAuthLogin } from '../../../hooks/useAuth'
import { useAuthModal } from '../hooks/useAuthModal'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const loginFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: '********',
      required: true,
    },
  ],
}

export const LoginForm = () => {
  const navigate = useNavigate()
  const loginMutation = useAuthLogin()
  const { close, setView, returnUrl } = useAuthModal()

  const handleSubmit = (values: Record<string, unknown>) => {
    loginMutation.mutate(
      {
        email: String(values.email),
        password: String(values.password),
      },
      {
        onSuccess: () => {
          close()
          if (returnUrl) {
            navigate({ to: returnUrl })
          }
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {loginMutation.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {loginMutation.error instanceof Error
            ? loginMutation.error.message
            : 'Login failed'}
        </div>
      )}

      <FNForm
        formDefinition={loginFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={loginMutation.isPending ? 'Signing in...' : 'Sign in'}
      />

      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-primary"
        onClick={() => setView('forgot-password')}
      >
        Forgot your password?
      </button>
    </div>
  )
}
