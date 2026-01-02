import { cn } from '../../../lib/utils'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../types/checkout'

type OrderStatusBadgeProps = {
  status: OrderStatus | PaymentStatus | FulfillmentStatus
  type?: 'order' | 'payment' | 'fulfillment'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Order status
  pending: {
    label: 'Pending',
    className:
      'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
  },
  processing: {
    label: 'Processing',
    className:
      'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  },
  shipped: {
    label: 'Shipped',
    className:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  },
  delivered: {
    label: 'Delivered',
    className:
      'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-500/30',
  },
  // Payment status
  paid: {
    label: 'Paid',
    className:
      'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-500/30',
  },
  failed: {
    label: 'Failed',
    className:
      'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-500/30',
  },
  refunded: {
    label: 'Refunded',
    className:
      'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  },
  // Fulfillment status
  unfulfilled: {
    label: 'Unfulfilled',
    className:
      'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
  },
  partial: {
    label: 'Partial',
    className:
      'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
  },
  fulfilled: {
    label: 'Fulfilled',
    className:
      'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-500/30',
  },
}

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const config = statusConfig[status] || {
    label: status,
    className:
      'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
