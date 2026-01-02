import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'

import { verifyEmailFn, resetPasswordFn } from '../../../server/auth-customer'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

interface PasswordSetupFormProps {
  token: string
  type: 'verify' | 'reset'
}

const passwordFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: '********',
      required: true,
      validate: (value: unknown) => {
        const password = value as string
        if (password.length < 8) {
          return 'Password must be at least 8 characters'
        }
        if (!/\d/.test(password)) {
          return 'Password must contain at least one number'
        }
        return undefined
      },
    },
    {
      name: 'confirmPassword',
      type: 'password',
      label: 'Confirm Password',
      placeholder: '********',
      required: true,
    },
  ],
}

export const PasswordSetupForm = ({ token, type }: PasswordSetupFormProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const currentLang = lang || 'en'
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      type === 'verify' ? verifyEmailFn({ data }) : resetPasswordFn({ data }),
    onSuccess: async () => {
      // Invalidate customer session to refresh auth state in customer pages
      await queryClient.invalidateQueries({ queryKey: ['customer', 'session'] })
      // Redirect to account page with correct language
      navigate({ to: '/$lang/account', params: { lang: currentLang } })
    },
  })

  const handleSubmit = (values: Record<string, unknown>) => {
    setMismatchError(null)

    if (values.password !== values.confirmPassword) {
      setMismatchError('Passwords do not match')
      return
    }

    mutation.mutate({
      token,
      password: String(values.password),
    })
  }

  const error =
    mismatchError ||
    (mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? 'Failed to set password'
        : null)

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={passwordFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          mutation.isPending ? 'Setting password...' : 'Set password'
        }
      />
    </div>
  )
}
