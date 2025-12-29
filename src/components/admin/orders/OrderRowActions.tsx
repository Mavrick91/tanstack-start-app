import { Link } from '@tanstack/react-router'
import {
  MoreHorizontal,
  Eye,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'

import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

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

export function OrderRowActions({
  orderId,
  orderNumber: _orderNumber,
  currentStatus,
  currentFulfillmentStatus,
  onStatusChange,
  isLoading = false,
}: OrderRowActionsProps) {
  const isCancelled = currentStatus === 'cancelled'

  const statusOptions: {
    status: OrderStatus
    label: string
    icon: React.ReactNode
  }[] = [
    {
      status: 'processing',
      label: 'Mark as Processing',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      status: 'shipped',
      label: 'Mark as Shipped',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      status: 'delivered',
      label: 'Mark as Delivered',
      icon: <CheckCircle className="w-4 h-4" />,
    },
  ]

  const availableStatusOptions = statusOptions.filter(
    (opt) => opt.status !== currentStatus && !isCancelled,
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-pink-500/5 group text-muted-foreground"
        >
          <MoreHorizontal className="w-4 h-4 transition-transform group-hover:scale-110" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl p-2 border-border/50 shadow-2xl backdrop-blur-xl bg-card/95"
      >
        <DropdownMenuLabel className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
          Quick Actions
        </DropdownMenuLabel>

        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5">
          <Link
            to="/admin/orders/$orderId"
            params={{ orderId }}
            className="flex items-center gap-3"
          >
            <Eye className="w-4 h-4" />
            <span className="font-bold text-sm">View Details</span>
          </Link>
        </DropdownMenuItem>

        {!isCancelled && (
          <>
            <DropdownMenuSeparator className="my-1 bg-border/50" />
            <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
              Update Status
            </DropdownMenuLabel>

            {availableStatusOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.status}
                onClick={() => onStatusChange(orderId, { status: opt.status })}
                disabled={isLoading}
                className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3"
              >
                {opt.icon}
                <span className="font-bold text-sm">{opt.label}</span>
              </DropdownMenuItem>
            ))}

            {currentFulfillmentStatus !== 'fulfilled' && (
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange(orderId, { fulfillmentStatus: 'fulfilled' })
                }
                disabled={isLoading}
                className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3"
              >
                <Package className="w-4 h-4" />
                <span className="font-bold text-sm">Mark Fulfilled</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1 bg-border/50" />

            <DropdownMenuItem
              onClick={() => onStatusChange(orderId, { status: 'cancelled' })}
              disabled={isLoading}
              className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3 text-destructive focus:text-destructive focus:bg-destructive/5"
            >
              <XCircle className="w-4 h-4" />
              <span className="font-bold text-sm">Cancel Order</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
