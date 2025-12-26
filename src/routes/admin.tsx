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
  User,
} from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '../components/ui/button'
import { useAuthStore } from '../hooks/useAuth'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    // Skip auth check for login page to avoid redirect loop
    if (location.pathname === '/admin/login') {
      return
    }
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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-pink-500/20 border-t-pink-500" />
      </div>
    )
  }

  // If not authenticated after loading, don't render (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Collections', path: '/admin/collections', icon: FolderOpen },
  ]

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar - Refined Premium Design */}
      <aside className="w-72 bg-card border-r border-border/50 p-8 flex flex-col shrink-0 relative z-20">
        <div className="flex items-center gap-3 mb-10 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-sm transition-transform duration-300">
            <span className="text-xs font-black italic">FN</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              FineNail
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-pink-500 leading-none">
              Control Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive =
              routerState.location.pathname === item.path ||
              (item.path !== '/admin' &&
                routerState.location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'hover:bg-pink-500/5 text-muted-foreground hover:text-pink-600'
                  }
                `}
              >
                <item.icon
                  className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-white' : 'text-pink-500/40 group-hover:text-pink-600'}`}
                />
                <span className="text-sm font-semibold tracking-wide">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Profile Section */}
        <div className="mt-auto pt-6 border-t border-border/50">
          <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3 mb-4 border border-border/50">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shadow-sm">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-foreground">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                Admin Profile
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-destructive/5 hover:text-destructive group transition-all duration-200 rounded-xl px-4 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10 px-10 py-8 scroll-smooth">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
