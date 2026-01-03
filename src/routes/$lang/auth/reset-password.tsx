import { createFileRoute, useSearch } from '@tanstack/react-router'

import { PasswordResetForm } from '@/features/auth'

const ResetPasswordPage = () => {
  const { token } = useSearch({ from: '/$lang/auth/reset-password' })

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">
            This password reset link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your new password below.
          </p>
        </div>
        <PasswordResetForm token={token} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/$lang/auth/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})
