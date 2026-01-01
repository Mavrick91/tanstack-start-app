import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

import { ForgotPasswordForm, useAuthModal } from '@/features/auth'

const ForgotPasswordPage = () => {
  const { setView } = useAuthModal()

  useEffect(() => {
    setView('forgot-password')
  }, [setView])

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/$lang/auth/forgot-password')({
  component: ForgotPasswordPage,
})
