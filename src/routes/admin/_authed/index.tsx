import { createFileRoute } from '@tanstack/react-router'
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  ArrowUpRight,
} from 'lucide-react'

export const Route = createFileRoute('/admin/_authed/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { user } = Route.useRouteContext()

  const stats = [
    {
      label: 'Order Volume',
      value: '1,234',
      icon: ShoppingBag,
      change: '+12%',
      color: 'pink',
    },
    {
      label: 'Active Inventory',
      value: '48',
      icon: Package,
      change: '+3',
      color: 'rose',
    },
    {
      label: 'Brand Fans',
      value: '892',
      icon: Users,
      change: '+24%',
      color: 'orange',
    },
    {
      label: 'Net Revenue',
      value: '$12,456',
      icon: TrendingUp,
      change: '+8%',
      color: 'emerald',
    },
  ]

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Hero Welcome Section - Refined */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, {user?.email?.split('@')[0] || 'Admin'}! 👋
          </h1>
          <p className="text-muted-foreground text-base font-medium leading-relaxed mb-6">
            Your store is performing well today. You have{' '}
            <span className="text-pink-600 font-bold">12 new orders</span> and a
            24% increase in engagement.
          </p>
          <div className="flex gap-3">
            <button className="bg-pink-500 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-pink-600 transition-colors shadow-sm uppercase tracking-wider">
              View Reports
            </button>
            <button className="bg-muted text-muted-foreground px-6 py-2 rounded-xl font-bold text-xs hover:bg-muted/80 transition-colors border border-border/50 uppercase tracking-wider">
              Quick Export
            </button>
          </div>
        </div>

        {/* Abstract Background - Subtler */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-card p-6 rounded-3xl border border-border/50 hover:border-pink-500/20 transition-all duration-300 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-10 rounded-xl bg-pink-500/5 flex items-center justify-center text-pink-500 group-hover:scale-105 transition-transform">
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 bg-emerald-500/5 text-emerald-600 rounded-lg border border-emerald-500/10">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground mb-0.5">
                {stat.value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold">Revenue Insights</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">
                Monthly Performance
              </p>
            </div>
            <select className="bg-muted/50 p-2 px-3 rounded-lg text-[10px] font-bold border border-border outline-none uppercase tracking-wider">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>

          <div className="h-48 flex items-end gap-2 px-2 relative">
            {[40, 65, 45, 80, 55, 90, 75, 60, 85, 95, 70, 50].map((h, i) => (
              <div key={i} className="flex-1 group relative">
                <div
                  className="w-full bg-pink-500/10 rounded-t-lg transition-all duration-500 hover:bg-pink-500/20 cursor-pointer"
                  style={{ height: `${h}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ${(h * 123).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-3xl border border-border/50 p-8 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Recent Activity</h2>
          <div className="space-y-6">
            {[
              {
                type: 'order',
                label: 'New order #3421',
                time: '2m ago',
              },
              {
                type: 'product',
                label: 'Lip Gloss restocked',
                time: '1h ago',
              },
              {
                type: 'user',
                label: 'New customer join',
                time: '3h ago',
              },
              {
                type: 'order',
                label: 'Payment approved',
                time: '4h ago',
              },
            ].map((activity, i) => (
              <div
                key={i}
                className="flex gap-4 items-center group cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-pink-500 transition-colors">
                    {activity.label}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all border border-border/50">
            View History
          </button>
        </div>
      </div>
    </div>
  )
}
