import {
  Outlet,
  createFileRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { LayoutDashboard, LogOut, Package } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '../components/ui/button'
import { useAuthStore } from '../hooks/useAuth'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    // Skip auth check for login page to avoid redirect loop
    if (location.pathname === '/admin/login') {
      return
    }
    // Note: Server-side auth is now handled via cookies
    // Client will verify via checkSession()
  },
  component: AdminLayout,
})

function AdminLayout() {
  const router = useRouter()
  const routerState = useRouterState()
  const { user, logout, isAuthenticated, isLoading, checkSession } =
    useAuthStore()

  const isLoginPage = routerState.location.pathname === '/admin/login'

  // Check session on mount
  useEffect(() => {
    if (!isLoginPage) {
      checkSession()
    }
  }, [isLoginPage, checkSession])

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      router.navigate({ to: '/admin/login' })
    }
  }, [isLoginPage, isLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.navigate({ to: '/admin/login' })
  }

  // For login page, render just the content without sidebar
  if (isLoginPage) {
    return <Outlet />
  }

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
      </div>
    )
  }

  // If not authenticated after loading, don't render (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-black">
            FN
          </div>
          <span className="text-lg font-bold">Admin</span>
        </div>

        <nav className="flex-1 space-y-2">
          <a
            href="/admin"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </a>
          <a
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
          >
            <Package className="w-4 h-4" />
            Products
          </a>
        </nav>

        <div className="pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground mb-2">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
