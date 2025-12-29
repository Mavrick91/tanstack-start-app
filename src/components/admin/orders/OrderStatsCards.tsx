import { Clock, CreditCard, Package, DollarSign } from 'lucide-react'

import { formatCurrency } from '../../../lib/format'

export interface OrderStats {
  pending: number
  unpaid: number
  unfulfilled: number
  todayRevenue: number
  currency: string
}

interface OrderStatsCardsProps {
  stats: OrderStats
  isLoading?: boolean
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  isLoading?: boolean
  variant?: 'default' | 'warning' | 'success' | 'info'
  hasAttention?: boolean
}

function StatCard({
  label,
  value,
  icon,
  isLoading,
  variant = 'default',
  hasAttention,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border/50',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    success: 'border-green-500/30 bg-green-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  }

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-yellow-500',
    success: 'text-green-500',
    info: 'text-blue-500',
  }

  const effectiveVariant = hasAttention ? variant : 'default'

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${
        variantStyles[effectiveVariant]
      } ${isLoading ? 'animate-pulse' : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 ${iconStyles[effectiveVariant]}`}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-2xl font-bold">{isLoading ? '—' : value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function OrderStatsCards({
  stats,
  isLoading = false,
}: OrderStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Pending Orders"
        value={stats.pending}
        icon={<Clock className="w-5 h-5" />}
        isLoading={isLoading}
        variant="warning"
        hasAttention={stats.pending > 0}
      />
      <StatCard
        label="Awaiting Payment"
        value={stats.unpaid}
        icon={<CreditCard className="w-5 h-5" />}
        isLoading={isLoading}
        variant="warning"
        hasAttention={stats.unpaid > 0}
      />
      <StatCard
        label="Unfulfilled"
        value={stats.unfulfilled}
        icon={<Package className="w-5 h-5" />}
        isLoading={isLoading}
        variant="info"
        hasAttention={stats.unfulfilled > 0}
      />
      <StatCard
        label="Today's Revenue"
        value={formatCurrency({
          value: stats.todayRevenue,
          currency: stats.currency,
        })}
        icon={<DollarSign className="w-5 h-5" />}
        isLoading={isLoading}
        variant="success"
        hasAttention={stats.todayRevenue > 0}
      />
    </div>
  )
}
