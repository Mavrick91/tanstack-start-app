import { useState } from 'react'

import { useAuthModal } from '../hooks/useAuthModal'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const forgotPasswordFormDefinition: FormDefinition = {
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

export const ForgotPasswordForm = () => {
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { setView } = useAuthModal()

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })

      // Always show success to prevent email enumeration
      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4 text-center">
          <h3 className="font-medium text-green-800">Check your email</h3>
          <p className="mt-1 text-sm text-green-700">
            If an account exists with that email, we sent you a password reset
            link.
          </p>
        </div>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:text-primary"
          onClick={() => setView('login')}
        >
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <FNForm
        formDefinition={forgotPasswordFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={isLoading ? 'Sending...' : 'Send reset link'}
      />

      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-primary"
        onClick={() => setView('login')}
      >
        Back to login
      </button>
    </div>
  )
}
