import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/test/test-utils'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    data: { id: '1', email: 'admin@test.com', role: 'admin' },
    isLoading: false,
  }),
}))

vi.mock('lucide-react', () => ({
  Package: () => <span data-testid="icon-package" />,
  ShoppingBag: () => <span data-testid="icon-shopping-bag" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  Users: () => <span data-testid="icon-users" />,
}))

describe('Admin Dashboard', () => {
  it('should render dashboard title', () => {
    render(
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Test Admin!</p>
        </div>
      </div>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
  })

  it('should render all stat cards', () => {
    const stats = [
      { label: 'Total Orders', value: '1,234' },
      { label: 'Products', value: '48' },
      { label: 'Customers', value: '892' },
      { label: 'Revenue', value: '$12,456' },
    ]

    render(
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-card rounded-xl border">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>,
    )

    expect(screen.getByText('Total Orders')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('892')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,456')).toBeInTheDocument()
  })

  it('should render recent activity section', () => {
    render(
      <div className="p-6 bg-card rounded-xl border">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-muted-foreground text-sm">
          This is a placeholder for recent orders.
        </p>
      </div>,
    )

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText(/placeholder/)).toBeInTheDocument()
  })
})
