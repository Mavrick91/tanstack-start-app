import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { OrderRowActions } from './OrderRowActions'
import { formatCurrency, formatDate } from '../../../lib/format'
import { Checkbox } from '../../ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { AdminStatusBadge } from '../components/AdminStatusBadge'
import { SortableHeader } from '../components/SortableHeader'

import type { OrderStatus, FulfillmentStatus } from '../../../types/checkout'
import type { OrderListItem } from '../../../types/order'

export type OrderSortKey =
  | 'orderNumber'
  | 'total'
  | 'status'
  | 'paymentStatus'
  | 'createdAt'
export type SortOrder = 'asc' | 'desc'

// Helper to render sortable or static header based on onSort availability
const OptionalSortHeader = ({
  label,
  sortKey,
  currentSortKey,
  sortOrder,
  onSort,
}: {
  label: string
  sortKey: OrderSortKey
  currentSortKey: OrderSortKey
  sortOrder: SortOrder
  onSort?: (key: OrderSortKey) => void
}) =>
  onSort ? (
    <SortableHeader
      label={label}
      sortKey={sortKey}
      currentSortKey={currentSortKey}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  ) : (
    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
      {label}
    </TableHead>
  )

type OrdersTableProps = {
  orders: OrderListItem[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onQuickStatusChange?: (
    orderId: string,
    updates: { status?: OrderStatus; fulfillmentStatus?: FulfillmentStatus },
  ) => void
  isUpdating?: boolean
  // Sorting props
  sortKey?: OrderSortKey
  sortOrder?: SortOrder
  onSort?: (key: OrderSortKey) => void
}

export const OrdersTable = ({
  orders,
  selectedIds = new Set(),
  onSelectionChange,
  onQuickStatusChange,
  isUpdating = false,
  sortKey = 'createdAt',
  sortOrder = 'desc',
  onSort,
}: OrdersTableProps) => {
  const { t } = useTranslation()

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange(new Set(orders.map((o) => o.id)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const handleSelectOne = (orderId: string, checked: boolean) => {
    if (!onSelectionChange) return
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    onSelectionChange(newSelected)
  }

  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o.id))
  const someSelected = orders.some((o) => selectedIds.has(o.id)) && !allSelected

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 border-b border-border hover:bg-transparent">
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    allSelected || (someSelected ? 'indeterminate' : false)
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label={t('Select all orders')}
                />
              </TableHead>
            )}
            <OptionalSortHeader
              label={t('Order')}
              sortKey="orderNumber"
              currentSortKey={sortKey}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {t('Customer')}
            </TableHead>
            <OptionalSortHeader
              label={t('Total')}
              sortKey="total"
              currentSortKey={sortKey}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <OptionalSortHeader
              label={t('Payment')}
              sortKey="paymentStatus"
              currentSortKey={sortKey}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {t('Fulfillment')}
            </TableHead>
            <OptionalSortHeader
              label={t('Status')}
              sortKey="status"
              currentSortKey={sortKey}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <OptionalSortHeader
              label={t('Date')}
              sortKey="createdAt"
              currentSortKey={sortKey}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            {onQuickStatusChange && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={onSelectionChange ? 9 : 7}
                className="text-center py-8 text-muted-foreground"
              >
                {t('No orders found')}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className={`cursor-pointer border-border hover:bg-muted/50 ${
                  selectedIds.has(order.id) ? 'bg-pink-500/5' : ''
                }`}
              >
                {onSelectionChange && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(order.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(order.id, !!checked)
                      }
                      aria-label={`Select order #${order.orderNumber}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="text-foreground font-medium hover:text-pink-500 transition-colors"
                  >
                    #{order.orderNumber}
                  </Link>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({order.itemCount} {t('items')})
                  </span>
                </TableCell>
                <TableCell className="text-foreground/80">
                  {order.email}
                </TableCell>
                <TableCell className="text-foreground font-medium">
                  {formatCurrency({
                    value: order.total,
                    currency: order.currency,
                  })}
                </TableCell>
                <TableCell>
                  <AdminStatusBadge status={order.paymentStatus} />
                </TableCell>
                <TableCell>
                  <AdminStatusBadge status={order.fulfillmentStatus} />
                </TableCell>
                <TableCell>
                  <AdminStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(order.createdAt, 'datetime')}
                </TableCell>
                {onQuickStatusChange && (
                  <TableCell>
                    <OrderRowActions
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      currentStatus={order.status}
                      currentFulfillmentStatus={order.fulfillmentStatus}
                      onStatusChange={onQuickStatusChange}
                      isLoading={isUpdating}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
