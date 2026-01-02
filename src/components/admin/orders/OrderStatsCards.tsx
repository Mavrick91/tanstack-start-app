import { Clock, CreditCard, Package, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatCurrency } from '../../../lib/format'
import { AdminStatsGrid } from '../components/AdminStatsCard'

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

export const OrderStatsCards = ({
  stats,
  isLoading = false,
}: OrderStatsCardsProps) => {
  const { t } = useTranslation()

  const statCards = [
    {
      label: t('Pending Orders'),
      value: stats.pending,
      icon: Clock,
      color: 'yellow' as const,
      hasAttention: stats.pending > 0,
    },
    {
      label: t('Awaiting Payment'),
      value: stats.unpaid,
      icon: CreditCard,
      color: 'yellow' as const,
      hasAttention: stats.unpaid > 0,
    },
    {
      label: t('Unfulfilled'),
      value: stats.unfulfilled,
      icon: Package,
      color: 'blue' as const,
      hasAttention: stats.unfulfilled > 0,
    },
    {
      label: t("Today's Revenue"),
      value: formatCurrency({
        value: stats.todayRevenue,
        currency: stats.currency,
      }),
      icon: DollarSign,
      color: 'green' as const,
      hasAttention: stats.todayRevenue > 0,
    },
  ]

  return <AdminStatsGrid stats={statCards} isLoading={isLoading} />
}
