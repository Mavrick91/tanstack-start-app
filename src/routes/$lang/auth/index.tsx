import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'

import { AuthForm, useAuthModal } from '@/features/auth'
import { getCustomerSessionFn } from '@/server/customers'

const AuthPage = () => {
  const { lang } = useParams({ from: '/$lang/auth/' })
  const navigate = useNavigate()
  const { open } = useAuthModal()

  // useQuery for reactivity
  const { data, isLoading } = useQuery({
    queryKey: ['customer', 'session'],
    queryFn: getCustomerSessionFn,
    staleTime: 5 * 60 * 1000,
  })

  const customer = data?.customer

  useEffect(() => {
    if (!isLoading) {
      if (customer) {
        navigate({ to: '/$lang/account', params: { lang } })
      } else {
        open('login')
      }
    }
  }, [customer, isLoading, navigate, lang, open])

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (customer) return null

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/$lang/auth/')({
  // Prefetch for SSR
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000,
    })
  },
  component: AuthPage,
})
