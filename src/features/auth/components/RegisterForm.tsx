import { useParams } from '@tanstack/react-router'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'
import { useAuthRegister } from '@/hooks/useAuth'

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

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const RegisterForm = () => {
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'

  const registerMutation = useAuthRegister()

  const handleSubmit = (values: Record<string, unknown>) => {
    registerMutation.mutate({ email: String(values.email), lang })
  }

  if (registerMutation.isSuccess) {
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
      {registerMutation.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {registerMutation.error instanceof Error
            ? registerMutation.error.message
            : 'Registration failed'}
        </div>
      )}

      <FNForm
        formDefinition={registerFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          registerMutation.isPending ? 'Creating account...' : 'Create account'
        }
      />

      <p className="text-xs text-muted-foreground">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </div>
  )
}
