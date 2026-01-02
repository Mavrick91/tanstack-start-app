import { useParams } from '@tanstack/react-router'

import { useAuthModal } from '../hooks/useAuthModal'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'
import { useAuthForgotPassword } from '@/hooks/useAuth'

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

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const ForgotPasswordForm = () => {
  const { setView } = useAuthModal()
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'

  const mutation = useAuthForgotPassword()

  const handleSubmit = (values: Record<string, unknown>) => {
    mutation.mutate({ email: String(values.email), lang })
  }

  if (mutation.isSuccess) {
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
        submitButtonText={mutation.isPending ? 'Sending...' : 'Send reset link'}
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
