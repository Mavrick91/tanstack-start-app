import { CheckCircle2, FileEdit, FolderOpen, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminStatsGrid } from '../../components/AdminStatsCard'

export interface CollectionStatsData {
  total: number
  active: number
  draft: number
  productsInCollections: number
}

interface CollectionStatsProps {
  stats: CollectionStatsData
  isLoading?: boolean
}

export const CollectionStats = ({ stats, isLoading }: CollectionStatsProps) => {
  const { t } = useTranslation()

  const statCards = [
    {
      label: t('Total Collections'),
      value: stats.total,
      icon: FolderOpen,
      color: 'pink' as const,
    },
    {
      label: t('Active'),
      value: stats.active,
      icon: CheckCircle2,
      color: 'emerald' as const,
    },
    {
      label: t('Drafts'),
      value: stats.draft,
      icon: FileEdit,
      color: 'amber' as const,
    },
    {
      label: t('Products in Collections'),
      value: stats.productsInCollections,
      icon: Package,
      color: 'violet' as const,
    },
  ]

  return <AdminStatsGrid stats={statCards} isLoading={isLoading} />
}
