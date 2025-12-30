import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getMeFn } from '../../server/auth'

export const Route = createFileRoute('/admin/_authed')({
  beforeLoad: async () => {
    const user = await getMeFn()

    if (!user) {
      throw redirect({ to: '/admin/login' })
    }

    if (user.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    return { user }
  },
  component: AdminAuthLayout,
})

function AdminAuthLayout() {
  return <Outlet />
}
