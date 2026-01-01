import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import {
  getCustomerSessionFn,
  type CustomerProfile,
} from '../../server/customers'

const AccountLayout = (): React.ReactNode => {
  return <Outlet />
}

export const Route = createFileRoute('/$lang/account')({
  beforeLoad: async ({ params, context }) => {
    // Use TanStack Query to cache customer session across navigations (5 min stale time)
    const session = await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })

    if (!session.customer) {
      throw redirect({ to: '/$lang', params })
    }

    return { customer: session.customer }
  },
  component: AccountLayout,
})

// Export type for child routes to use
export type AccountRouteContext = {
  customer: CustomerProfile
}
