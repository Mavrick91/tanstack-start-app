import { AlertTriangle, CheckCircle2, FileEdit, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProductStats as ProductStatsData } from '../../../../hooks/useProductStats'

interface ProductStatsProps {
  stats: ProductStatsData
}

export function ProductStats({ stats }: ProductStatsProps) {
  const { t } = useTranslation()
  const total = stats.totalProducts
  const active = stats.activeCount
  const draft = stats.draftCount
  const lowStock = stats.lowStockCount

  const statCards = [
    {
      label: t('Total Products'),
      value: total,
      icon: Package,
      color: 'text-pink-500',
      bg: 'bg-pink-500/5',
    },
    {
      label: t('Active'),
      value: active,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/5',
    },
    {
      label: t('Drafts'),
      value: draft,
      icon: FileEdit,
      color: 'text-amber-500',
      bg: 'bg-amber-500/5',
    },
    {
      label: t('Low Stock'),
      value: lowStock,
      icon: AlertTriangle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/5',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className={`p-3 rounded-xl ${stat.bg}`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
