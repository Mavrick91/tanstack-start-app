import { AlertTriangle, CheckCircle2, FileEdit, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminStatsGrid } from '../../components/AdminStatsCard'

import type { ProductStats as ProductStatsData } from '../../../../hooks/useProductStats'

interface ProductStatsProps {
  stats: ProductStatsData
  isLoading?: boolean
}

export const ProductStats = ({ stats, isLoading }: ProductStatsProps) => {
  const { t } = useTranslation()

  const statCards = [
    {
      label: t('Total Products'),
      value: stats.totalProducts,
      icon: Package,
      color: 'pink' as const,
    },
    {
      label: t('Active'),
      value: stats.activeCount,
      icon: CheckCircle2,
      color: 'emerald' as const,
    },
    {
      label: t('Drafts'),
      value: stats.draftCount,
      icon: FileEdit,
      color: 'amber' as const,
    },
    {
      label: t('Low Stock'),
      value: stats.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: 'rose' as const,
      hasAttention: (stats.lowStockCount ?? 0) > 0,
    },
  ]

  return <AdminStatsGrid stats={statCards} isLoading={isLoading} />
}
