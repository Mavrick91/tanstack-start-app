import { createFileRoute, useSearch } from '@tanstack/react-router'

import { EmailVerificationHandler } from '@/features/auth'

const VerifyPage = () => {
  const { token } = useSearch({ from: '/$lang/auth/verify' })

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">
            This verification link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return <EmailVerificationHandler token={token} />
}

export const Route = createFileRoute('/$lang/auth/verify')({
  component: VerifyPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
})
