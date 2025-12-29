import {
  Outlet,
  createFileRoute,
  useRouter,
  useRouterState,
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
import { useEffect } from 'react'

import { Button } from '../components/ui/button'
import { useAuthStore } from '../hooks/useAuth'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/admin/login') return
  },
  component: AdminLayout,
})

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Collections', path: '/admin/collections', icon: FolderOpen },
]

function AdminLayout() {
  const router = useRouter()
  const { location } = useRouterState()
  const { user, logout, isAuthenticated, isLoading, checkSession } =
    useAuthStore()
  const isLoginPage = location.pathname === '/admin/login'

  useEffect(() => {
    if (!isLoginPage) checkSession()
  }, [isLoginPage, checkSession])

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      router.navigate({ to: '/admin/login' })
    }
  }, [isLoginPage, isLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.navigate({ to: '/admin/login' })
  }

  if (isLoginPage) return <Outlet />

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full size-10 border-2 border-pink-500/20 border-t-pink-500" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <aside className="w-72 bg-card border-r border-border/50 p-4 pt-8 flex flex-col shrink-0 z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="size-9 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-sm">
            <span className="text-xs font-black italic">FN</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">FineNail</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-pink-500">
              Control Panel
            </p>
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors group ${
                  isActive
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-pink-500/5 hover:text-pink-600'
                }`}
              >
                <item.icon
                  className={`size-4 ${isActive ? '' : 'text-pink-500/40 group-hover:text-pink-600'}`}
                />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border/50">
          <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3 mb-4 border border-border/50">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center border border-border">
              <User className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                Admin
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/5 hover:text-destructive rounded-xl px-4"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Logout
            </span>
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
