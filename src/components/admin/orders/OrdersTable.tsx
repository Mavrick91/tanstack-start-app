import { Link } from '@tanstack/react-router'

import { OrderRowActions } from './OrderRowActions'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatCurrency } from '../../../lib/format'
import { Checkbox } from '../../ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'

import type { OrderStatus, FulfillmentStatus } from '../../../types/checkout'
import type { OrderListItem } from '../../../types/order'

type OrdersTableProps = {
  orders: OrderListItem[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onQuickStatusChange?: (
    orderId: string,
    updates: { status?: OrderStatus; fulfillmentStatus?: FulfillmentStatus },
  ) => void
  isUpdating?: boolean
}

export const OrdersTable = ({
  orders,
  selectedIds = new Set(),
  onSelectionChange,
  onQuickStatusChange,
  isUpdating = false,
}: OrdersTableProps) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-muted/50">
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    allSelected || (someSelected ? 'indeterminate' : false)
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all orders"
                />
              </TableHead>
            )}
            <TableHead className="text-muted-foreground font-semibold">
              Order
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Customer
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Total
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Payment
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Fulfillment
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Status
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Date
            </TableHead>
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
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className={`border-border hover:bg-muted/50 ${
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
                    ({order.itemCount} items)
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
                  <OrderStatusBadge
                    status={order.paymentStatus}
                    type="payment"
                  />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge
                    status={order.fulfillmentStatus}
                    type="fulfillment"
                  />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} type="order" />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(order.createdAt)}
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
