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

// Unified status styling with coral theme
const statusStyles: Record<string, StatusStyle> = {
  // Product & Collection statuses
  active: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  draft: {
    bg: 'bg-stone-50 border-stone-200',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
  },
  archived: {
    bg: 'bg-stone-50 border-stone-200',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
  },

  // Order statuses
  pending: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  processing: {
    bg: 'bg-coral-50 border-coral-200',
    text: 'text-coral-700',
    dot: 'bg-coral-500',
  },
  shipped: {
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  delivered: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    bg: 'bg-stone-50 border-stone-200',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
  },

  // Payment statuses
  paid: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  failed: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  refunded: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },

  // Fulfillment statuses
  unfulfilled: {
    bg: 'bg-stone-50 border-stone-200',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
  },
  partial: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  fulfilled: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
}

// Default fallback style
const defaultStyle: StatusStyle = {
  bg: 'bg-stone-50 border-stone-200',
  text: 'text-stone-700',
  dot: 'bg-stone-400',
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
      <span
        className={cn(
          'text-xs font-medium',
          style.text,
        )}
      >
        {label}
      </span>
    </span>
  )
}
