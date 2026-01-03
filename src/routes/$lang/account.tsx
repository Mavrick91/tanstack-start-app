import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import {
  getCustomerSessionFn,
  type CustomerProfile,
} from '../../server/customers'

const AccountLayout = () => {
  // If we reach here, user is authenticated (checked in beforeLoad)
  return <Outlet />
}

export const Route = createFileRoute('/$lang/account')({
  beforeLoad: async ({ context, params }) => {
    // Check if customer is authenticated
    const result = await context.queryClient.ensureQueryData({
      queryKey: ['customer', 'session'],
      queryFn: getCustomerSessionFn,
      staleTime: 5 * 60 * 1000,
    })

    // If not authenticated, redirect to home page
    if (!result.customer) {
      throw redirect({
        to: '/$lang',
        params: { lang: params.lang },
      })
    }
  },
  component: AccountLayout,
})

export type AccountRouteContext = {
  customer: CustomerProfile
}
