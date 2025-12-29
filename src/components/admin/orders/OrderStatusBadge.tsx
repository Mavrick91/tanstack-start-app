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
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  // Payment status
  paid: {
    label: 'Paid',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  // Fulfillment status
  unfulfilled: {
    label: 'Unfulfilled',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  partial: {
    label: 'Partial',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  fulfilled: {
    label: 'Fulfilled',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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
