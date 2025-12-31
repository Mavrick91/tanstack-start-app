import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import {
  getCustomerSessionFn,
  type CustomerProfile,
} from '../../server/customers'

const AccountLayout = (): React.ReactNode => {
  return <Outlet />
}

export const Route = createFileRoute('/$lang/account')({
  beforeLoad: async ({ params }) => {
    const session = await getCustomerSessionFn()

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
