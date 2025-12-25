import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { Button } from '../../components/ui/button'
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

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      const success = await login(value.email, value.password)
      if (success) {
        router.navigate({ to: '/admin' })
      } else {
        form.setFieldMeta('email', (prev) => ({
          ...prev,
          errorMap: { onChange: 'Invalid email or password' },
        }))
      }
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black">
            FN
          </div>
          <span className="text-2xl font-bold">Admin</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) =>
                !value
                  ? 'Email is required'
                  : !/^\S+@\S+\.\S+$/.test(value)
                    ? 'Invalid email format'
                    : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="admin@finenail.com"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) =>
                !value
                  ? 'Password is required'
                  : value.length < 6
                    ? 'Password must be at least 6 characters'
                    : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="••••••••"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-lg hover:from-pink-600 hover:to-rose-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Demo: admin@finenail.com / admin123
        </p>
      </div>
    </div>
  )
}
