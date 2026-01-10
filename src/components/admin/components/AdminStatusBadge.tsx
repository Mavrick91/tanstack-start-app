import { cn } from '../../../lib/utils'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../types/checkout'
import type { ProductStatus } from '../products/types'

// Collection status is derived from publishedAt
export type CollectionStatus = 'active' | 'draft'

type StatusVariant =
  | 'product'
  | 'order'
  | 'payment'
  | 'fulfillment'
  | 'collection'

type StatusType =
  | ProductStatus
  | OrderStatus
  | PaymentStatus
  | FulfillmentStatus
  | CollectionStatus

export type AdminStatusBadgeProps = {
  status: StatusType
  variant?: StatusVariant
  showDot?: boolean
  className?: string
}

type StatusStyle = {
  bg: string
  text: string
  dot: string
}

// Unified status styling with full dark mode support
const statusStyles: Record<string, StatusStyle> = {
  // Product & Collection statuses
  active: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-800 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  draft: {
    bg: 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-800 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  archived: {
    bg: 'bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30',
    text: 'text-gray-800 dark:text-gray-400',
    dot: 'bg-gray-500',
  },

  // Order statuses
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  processing: {
    bg: 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    text: 'text-blue-800 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  shipped: {
    bg: 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
    text: 'text-purple-800 dark:text-purple-400',
    dot: 'bg-purple-500',
  },
  delivered: {
    bg: 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    text: 'text-red-800 dark:text-red-400',
    dot: 'bg-red-500',
  },

  // Payment statuses
  paid: {
    bg: 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    text: 'text-red-800 dark:text-red-400',
    dot: 'bg-red-500',
  },
  refunded: {
    bg: 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
    text: 'text-orange-800 dark:text-orange-400',
    dot: 'bg-orange-500',
  },

  // Fulfillment statuses
  unfulfilled: {
    bg: 'bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30',
    text: 'text-gray-800 dark:text-gray-400',
    dot: 'bg-gray-500',
  },
  partial: {
    bg: 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  fulfilled: {
    bg: 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
}

// Default fallback style
const defaultStyle: StatusStyle = {
  bg: 'bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30',
  text: 'text-gray-800 dark:text-gray-400',
  dot: 'bg-gray-500',
}

// Human-readable labels for status values
const statusLabels: Record<string, string> = {
  // Product & Collection
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived',
  // Order
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  // Payment
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  // Fulfillment
  unfulfilled: 'Unfulfilled',
  partial: 'Partial',
  fulfilled: 'Fulfilled',
}

export const AdminStatusBadge = ({
  status,
  showDot = true,
  className,
}: AdminStatusBadgeProps) => {
  const style = statusStyles[status] || defaultStyle
  const label = statusLabels[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
        style.bg,
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      )}
      <span className={cn('text-xs font-medium', style.text)}>{label}</span>
    </span>
  )
}
