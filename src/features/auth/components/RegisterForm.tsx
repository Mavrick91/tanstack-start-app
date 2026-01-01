import { useState } from 'react'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const registerFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
  ],
}

export const RegisterForm = () => {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (values: Record<string, unknown>) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center">
        <h3 className="font-medium text-green-800">Check your email</h3>
        <p className="mt-1 text-sm text-green-700">
          We sent you a verification link. Click the link to set your password
          and activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FNForm
        formDefinition={registerFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={isLoading ? 'Creating account...' : 'Create account'}
      />

      <p className="text-xs text-muted-foreground">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </div>
  )
}
