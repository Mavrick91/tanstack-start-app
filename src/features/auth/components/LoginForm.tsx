import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { useAuthStore } from '../../../hooks/useAuth'
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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const login = useAuthStore((state) => state.login)
  const { close, setView, returnUrl } = useAuthModal()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)
    setIsLoading(true)

    try {
      const result = await login(
        values.email as string,
        values.password as string,
      )

      if (result.success) {
        // Invalidate customer session query and router to refetch data
        await queryClient.invalidateQueries({
          queryKey: ['customer', 'session'],
        })
        await router.invalidate()
        close()
        if (returnUrl) {
          navigate({ to: returnUrl })
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={loginFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={isLoading ? 'Signing in...' : 'Sign in'}
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
