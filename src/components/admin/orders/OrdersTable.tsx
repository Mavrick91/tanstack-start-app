import { Link } from '@tanstack/react-router'

import { OrderStatusBadge } from './OrderStatusBadge'
import { formatCurrency } from '../../../lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'

import type { OrderListItem } from '../../../types/order'

type OrdersTableProps = {
  orders: OrderListItem[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-muted/50">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow
                key={order.id}
                className="border-border hover:bg-muted/50"
              >
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
