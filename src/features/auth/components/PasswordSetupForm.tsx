import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const endpoint =
        type === 'verify'
          ? '/api/auth/verify-email'
          : '/api/auth/reset-password'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to set password')
        return
      }

      // Redirect to account page on success
      navigate({ to: '/$lang/account', params: { lang: 'en' } })
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
        formDefinition={passwordFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={isLoading ? 'Setting password...' : 'Set password'}
      />
    </div>
  )
}
