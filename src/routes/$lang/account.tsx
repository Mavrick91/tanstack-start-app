import { useQuery } from '@tanstack/react-query'
import { Outlet, createFileRoute } from '@tanstack/react-router'

import {
  getCustomerSessionFn,
  type CustomerProfile,
} from '../../server/customers'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AuthForm } from '@/features/auth'

const AccountLayout = () => {
  // useQuery for reactivity - will hit cache from beforeLoad on initial render
  const { data, isLoading } = useQuery({
    queryKey: ['customer', 'session'],
    queryFn: getCustomerSessionFn,
    staleTime: 5 * 60 * 1000,
  })

  const customer = data?.customer
  const showAuthDialog = !isLoading && !customer

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Show auth dialog directly based on customer state - no modal store needed */}
      <Dialog open={showAuthDialog}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="sr-only">Login</DialogTitle>
          </DialogHeader>
          <AuthForm />
        </DialogContent>
      </Dialog>
      {customer ? (
        <Outlet />
      ) : (
        <div className="pointer-events-none opacity-50">
          <Outlet />
        </div>
      )}
    </>
  )
}

export const Route = createFileRoute('/$lang/account')({
  // Prefetch for SSR - data will be in cache when component renders
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000,
    })
  },
  component: AccountLayout,
})

export type AccountRouteContext = {
  customer: CustomerProfile
}
