import { useQueryClient } from '@tanstack/react-query'
import {
  Outlet,
  createFileRoute,
  useRouter,
  Link,
} from '@tanstack/react-router'
import {
  LayoutDashboard,
  LogOut,
  Package,
  FolderOpen,
  ShoppingCart,
  User,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { getMeFn, logoutFn } from '../server/auth'

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Collections', path: '/admin/collections', icon: FolderOpen },
]

const AdminLayout = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = Route.useRouteContext()

  const handleLogout = async () => {
    // Call server function directly instead of Zustand action
    await logoutFn()
    // Invalidate cached auth to force re-fetch on next login
    queryClient.removeQueries({ queryKey: ['admin', 'auth'] })
    router.navigate({ to: '/' })
  }

  // Auth is handled by _authed.tsx beforeLoad - if we get here, user is authenticated
  return (
    <div className="h-screen flex overflow-hidden bg-stone-50">
      <aside className="w-60 bg-white border-r border-stone-100 p-4 pt-8 flex flex-col shrink-0 z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="size-9 rounded-xl bg-coral-500 flex items-center justify-center text-white shadow-sm">
            <span className="text-xs font-black italic">FN</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              FineNail
            </h1>
            <p className="text-xs font-medium text-coral-500">Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin' &&
                location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-coral-50 text-coral-600 border-l-2 border-coral-500'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <item.icon
                  className={`size-4 ${isActive ? 'text-coral-500' : 'text-stone-400 group-hover:text-stone-600'}`}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100">
          <div className="bg-stone-50 p-4 rounded-xl flex items-center gap-3 mb-4 border border-stone-100">
            <div className="size-9 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
              <User className="size-4 text-stone-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-stone-500">Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-stone-500 hover:bg-red-50 hover:text-red-600 rounded-lg px-4"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto z-10 px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    // Use TanStack Query to cache auth across navigations (5 min stale time)
    const user = await context.queryClient.ensureQueryData({
      queryKey: ['admin', 'auth'],
      queryFn: getMeFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
    return { user }
  },
  component: AdminLayout,
})
