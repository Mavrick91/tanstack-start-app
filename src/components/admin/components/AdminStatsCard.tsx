import { cn } from '../../../lib/utils'

import type { LucideIcon } from 'lucide-react'

export type StatsCardColor =
  | 'pink'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'blue'
  | 'yellow'
  | 'green'

export type AdminStatsCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  color: StatsCardColor
  isLoading?: boolean
  hasAttention?: boolean
}

export type AdminStatsGridProps = {
  stats: AdminStatsCardProps[]
  isLoading?: boolean
  columns?: 2 | 3 | 4
}

const colorStyles: Record<
  StatsCardColor,
  { bg: string; text: string; attention: string }
> = {
  pink: {
    bg: 'bg-pink-500/5',
    text: 'text-pink-500',
    attention: 'border-pink-500/30 bg-pink-500/5',
  },
  emerald: {
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-500',
    attention: 'border-emerald-500/30 bg-emerald-500/5',
  },
  amber: {
    bg: 'bg-amber-500/5',
    text: 'text-amber-500',
    attention: 'border-amber-500/30 bg-amber-500/5',
  },
  rose: {
    bg: 'bg-rose-500/5',
    text: 'text-rose-500',
    attention: 'border-rose-500/30 bg-rose-500/5',
  },
  violet: {
    bg: 'bg-violet-500/5',
    text: 'text-violet-500',
    attention: 'border-violet-500/30 bg-violet-500/5',
  },
  blue: {
    bg: 'bg-blue-500/5',
    text: 'text-blue-500',
    attention: 'border-blue-500/30 bg-blue-500/5',
  },
  yellow: {
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-500',
    attention: 'border-yellow-500/30 bg-yellow-500/5',
  },
  green: {
    bg: 'bg-green-500/5',
    text: 'text-green-500',
    attention: 'border-green-500/30 bg-green-500/5',
  },
}

export const AdminStatsCard = ({
  label,
  value,
  icon: Icon,
  color,
  isLoading = false,
  hasAttention = false,
}: AdminStatsCardProps) => {
  const styles = colorStyles[color]

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse">
        <div className="p-3 rounded-xl bg-muted/50 w-11 h-11" />
        <div className="space-y-2">
          <div className="h-7 w-12 bg-muted/50 rounded" />
          <div className="h-3 w-20 bg-muted/50 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-card border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow',
        hasAttention ? styles.attention : 'border-border/50',
      )}
    >
      <div className={cn('p-3 rounded-xl', styles.bg)}>
        <Icon className={cn('w-5 h-5', styles.text)} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export const AdminStatsGrid = ({
  stats,
  isLoading = false,
  columns = 4,
}: AdminStatsGridProps) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridCols[columns])}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse"
          >
            <div className="p-3 rounded-xl bg-muted/50 w-11 h-11" />
            <div className="space-y-2">
              <div className="h-7 w-12 bg-muted/50 rounded" />
              <div className="h-3 w-20 bg-muted/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {stats.map((stat) => (
        <AdminStatsCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
