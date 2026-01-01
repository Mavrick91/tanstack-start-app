import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

const AdminAuthLayout = (): React.ReactNode => {
  return <Outlet />
}

export const Route = createFileRoute('/admin/_authed')({
  beforeLoad: async ({ context }) => {
    // Use user from parent context (admin.tsx) to avoid duplicate fetch
    const user = context.user

    if (!user) {
      throw redirect({ to: '/admin/login' })
    }

    if (user.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    // Pass user through to child routes
    return { user }
  },
  component: AdminAuthLayout,
})
