import { createFileRoute } from '@tanstack/react-router'
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  ArrowUpRight,
} from 'lucide-react'

const AdminDashboard = (): React.ReactNode => {
  const { user } = Route.useRouteContext()

  const stats = [
    {
      label: 'Order volume',
      value: '1,234',
      icon: ShoppingBag,
      change: '+12%',
    },
    {
      label: 'Active inventory',
      value: '48',
      icon: Package,
      change: '+3',
    },
    {
      label: 'Brand fans',
      value: '892',
      icon: Users,
      change: '+24%',
    },
    {
      label: 'Net revenue',
      value: '$12,456',
      icon: TrendingUp,
      change: '+8%',
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">
            Welcome back, {user?.email?.split('@')[0] || 'Admin'}
          </h1>
          <p className="text-stone-500 text-base leading-relaxed mb-6">
            Your store is performing well today. You have{' '}
            <span className="text-coral-600 font-semibold">12 new orders</span>{' '}
            and a 24% increase in engagement.
          </p>
          <div className="flex gap-3">
            <button className="bg-coral-500 text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-coral-600 transition-colors">
              View reports
            </button>
            <button className="bg-white text-stone-600 px-5 py-2 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors border border-stone-200">
              Quick export
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-white p-6 rounded-2xl border border-stone-200 hover:border-coral-200 hover:shadow-md transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center text-coral-500 group-hover:scale-105 transition-transform">
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold text-stone-900 mb-1">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-stone-500">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Revenue insights
              </h2>
              <p className="text-sm text-stone-500 mt-1">Monthly performance</p>
            </div>
            <select className="bg-stone-50 p-2 px-3 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-500/20">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          <div className="h-48 flex items-end gap-2 px-2 relative">
            {[40, 65, 45, 80, 55, 90, 75, 60, 85, 95, 70, 50].map((h, i) => (
              <div key={i} className="flex-1 group relative">
                <div
                  className="w-full bg-coral-100 rounded-t-lg transition-all duration-300 hover:bg-coral-200 cursor-pointer"
                  style={{ height: `${h}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ${(h * 123).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">
            Recent activity
          </h2>
          <div className="space-y-5">
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
                label: 'New customer joined',
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
                className="flex gap-4 items-center group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-coral-50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-coral-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate group-hover:text-coral-600 transition-colors">
                    {activity.label}
                  </p>
                  <p className="text-xs text-stone-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 rounded-xl bg-stone-50 text-stone-600 text-sm font-medium hover:bg-stone-100 transition-colors border border-stone-200">
            View history
          </button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/_authed/')({
  component: AdminDashboard,
})
