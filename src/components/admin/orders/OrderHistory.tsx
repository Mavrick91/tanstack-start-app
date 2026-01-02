import { Clock, Loader2, User, Bot, ArrowRight } from 'lucide-react'

import { OrderStatusBadge } from './OrderStatusBadge'
import { formatDate } from '../../../lib/format'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../types/checkout'

export interface OrderHistoryEntry {
  id: string
  field: 'status' | 'paymentStatus' | 'fulfillmentStatus'
  previousValue: string
  newValue: string
  changedBy: string
  changedAt: Date
  reason?: string
}

interface OrderHistoryProps {
  entries: OrderHistoryEntry[]
  isLoading?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Order Status',
  paymentStatus: 'Payment Status',
  fulfillmentStatus: 'Fulfillment Status',
}

const BADGE_TYPE_MAP: Record<string, 'order' | 'payment' | 'fulfillment'> = {
  status: 'order',
  paymentStatus: 'payment',
  fulfillmentStatus: 'fulfillment',
}

export const OrderHistory = ({
  entries,
  isLoading = false,
}: OrderHistoryProps) => {
  const isSystem = (changedBy: string) => {
    return changedBy === 'system' || changedBy.startsWith('webhook')
  }

  // Sort entries by date, newest first
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  )

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-pink-500" />
        Order History
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading history...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No history available</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                data-testid="history-entry"
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-pink-500" />

                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {FIELD_LABELS[entry.field] || entry.field}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(entry.changedAt, 'datetime')}
                    </span>
                  </div>

                  {/* Status change */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <OrderStatusBadge
                      status={
                        entry.previousValue as
                          | OrderStatus
                          | PaymentStatus
                          | FulfillmentStatus
                      }
                      type={BADGE_TYPE_MAP[entry.field]}
                    />
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <OrderStatusBadge
                      status={
                        entry.newValue as
                          | OrderStatus
                          | PaymentStatus
                          | FulfillmentStatus
                      }
                      type={BADGE_TYPE_MAP[entry.field]}
                    />
                  </div>

                  {/* Reason */}
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}

                  {/* Changed by */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSystem(entry.changedBy) ? (
                      <>
                        <Bot className="w-3 h-3" />
                        <span>system</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        <span>{entry.changedBy}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
