import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useRef } from 'react'

import { Button } from '../../components/ui/button'
import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
} from '../../components/ui/fn-form'
import { useAuthStore } from '../../hooks/useAuth'

export const Route = createFileRoute('/admin/login')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/admin' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const formRef = useRef<FNFormRef | null>(null)

  const formDefinition: FormDefinition = {
    fields: [
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'Enter your email',
        required: true,
        validateOnChange: true,
        inputClassName:
          'w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500',
        validate: (value) => {
          const email = String(value || '')
          if (!email) return 'Email is required'
          if (!/^\S+@\S+\.\S+$/.test(email)) return 'Invalid email format'
          return undefined
        },
      },
      {
        name: 'password',
        type: 'password',
        label: 'Password',
        placeholder: '••••••••',
        required: true,
        validateOnChange: true,
        inputClassName:
          'w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500',
        validate: (value) => {
          const password = String(value || '')
          if (!password) return 'Password is required'
          if (password.length < 6)
            return 'Password must be at least 6 characters'
          return undefined
        },
      },
    ],
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    const email = String(values.email || '')
    const password = String(values.password || '')

    const result = await login(email, password)
    if (result.success) {
      router.navigate({ to: '/admin' })
    } else {
      formRef.current?.setFieldError('email', result.error || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black">
            FN
          </div>
          <span className="text-2xl font-bold">Admin</span>
        </div>

        <FNForm
          formDefinition={formDefinition}
          onSubmit={handleSubmit}
          formRef={formRef}
          className="space-y-6"
          renderSubmitButton={(isSubmitting) => (
            <Button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-lg hover:from-pink-600 hover:to-rose-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          )}
        />
      </div>
    </div>
  )
}
