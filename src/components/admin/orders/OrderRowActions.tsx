import { Truck, Package, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AdminRowActions,
  type StatusAction,
} from '../components/AdminRowActions'

import type { OrderStatus, FulfillmentStatus } from '../../../types/checkout'

interface OrderRowActionsProps {
  orderId: string
  orderNumber: number
  currentStatus: OrderStatus
  currentFulfillmentStatus: FulfillmentStatus
  onStatusChange: (
    orderId: string,
    updates: { status?: OrderStatus; fulfillmentStatus?: FulfillmentStatus },
  ) => void
  isLoading?: boolean
}

export const OrderRowActions = ({
  orderId,
  orderNumber,
  currentStatus,
  currentFulfillmentStatus,
  onStatusChange,
  isLoading = false,
}: OrderRowActionsProps) => {
  const { t } = useTranslation()
  const isCancelled = currentStatus === 'cancelled'

  // Build status actions based on current state
  const statusActions: StatusAction[] = []

  if (!isCancelled) {
    if (currentStatus !== 'processing') {
      statusActions.push({
        key: 'processing',
        label: t('Mark as Processing'),
        icon: Clock,
        onClick: () => onStatusChange(orderId, { status: 'processing' }),
      })
    }

    if (currentStatus !== 'shipped') {
      statusActions.push({
        key: 'shipped',
        label: t('Mark as Shipped'),
        icon: Truck,
        onClick: () => onStatusChange(orderId, { status: 'shipped' }),
      })
    }

    if (currentStatus !== 'delivered') {
      statusActions.push({
        key: 'delivered',
        label: t('Mark as Delivered'),
        icon: CheckCircle,
        onClick: () => onStatusChange(orderId, { status: 'delivered' }),
      })
    }

    if (currentFulfillmentStatus !== 'fulfilled') {
      statusActions.push({
        key: 'fulfilled',
        label: t('Mark Fulfilled'),
        icon: Package,
        onClick: () =>
          onStatusChange(orderId, { fulfillmentStatus: 'fulfilled' }),
      })
    }
  }

  return (
    <AdminRowActions
      viewUrl={`/admin/orders/${orderId}`}
      viewLabel={t('View Details')}
      statusActions={isCancelled ? undefined : statusActions}
      statusActionsLabel={t('Update Status')}
      destructiveAction={
        isCancelled
          ? undefined
          : {
              label: t('Cancel Order'),
              icon: XCircle,
              confirmTitle: t('Cancel Order #{{orderNumber}}?', {
                orderNumber,
              }),
              confirmDescription: t(
                'This will mark the order as cancelled. This action cannot be easily undone.',
              ),
              onConfirm: () => onStatusChange(orderId, { status: 'cancelled' }),
            }
      }
      isLoading={isLoading}
    />
  )
}
