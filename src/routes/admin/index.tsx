import { createFileRoute } from '@tanstack/react-router'
import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react'

import { useAuthStore } from '../../hooks/useAuth'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const user = useAuthStore((state) => state.user)

  const stats = [
    {
      label: 'Total Orders',
      value: '1,234',
      icon: ShoppingBag,
      change: '+12%',
    },
    { label: 'Products', value: '48', icon: Package, change: '+3' },
    { label: 'Customers', value: '892', icon: Users, change: '+24%' },
    { label: 'Revenue', value: '$12,456', icon: TrendingUp, change: '+8%' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email || 'Admin'}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-card rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-green-500">
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-card rounded-xl border border-border">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-muted-foreground text-sm">
          This is a placeholder for recent orders, activity feed, or analytics
          charts.
        </p>
      </div>
    </div>
  )
}
