import { Loader2, Package, CreditCard, Truck, User } from 'lucide-react'
import { useState } from 'react'

import { OrderCancellationDialog } from './OrderCancellationDialog'
import { OrderHistory, type OrderHistoryEntry } from './OrderHistory'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatCurrency, formatDate } from '../../../lib/format'
import { Button } from '../../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Separator } from '../../ui/separator'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../types/checkout'
import type { Order } from '../../../types/order'

type OrderDetailProps = {
  order: Order
  onUpdateStatus: (updates: {
    status?: OrderStatus
    paymentStatus?: PaymentStatus
    fulfillmentStatus?: FulfillmentStatus
    reason?: string
  }) => Promise<void>
  historyEntries?: OrderHistoryEntry[]
  isLoadingHistory?: boolean
}

export const OrderDetail = ({
  order,
  onUpdateStatus,
  historyEntries = [],
  isLoadingHistory = false,
}: OrderDetailProps) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [status, setStatus] = useState(order.status)
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order.fulfillmentStatus,
  )

  const handleSaveStatus = async () => {
    // If user selected cancelled, show the confirmation dialog instead
    if (status === 'cancelled' && order.status !== 'cancelled') {
      setShowCancelDialog(true)
      return
    }

    setIsUpdating(true)
    try {
      await onUpdateStatus({
        status: status !== order.status ? status : undefined,
        fulfillmentStatus:
          fulfillmentStatus !== order.fulfillmentStatus
            ? fulfillmentStatus
            : undefined,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelOrder = async (reason: string) => {
    setIsCancelling(true)
    try {
      await onUpdateStatus({
        status: 'cancelled',
        reason,
      })
      setShowCancelDialog(false)
      setStatus('cancelled')
    } finally {
      setIsCancelling(false)
    }
  }

  const hasChanges =
    status !== order.status || fulfillmentStatus !== order.fulfillmentStatus

  const isCancelledOrder = order.status === 'cancelled'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.orderNumber}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Placed on {formatDate(order.createdAt, 'long')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} type="order" />
          <OrderStatusBadge status={order.paymentStatus} type="payment" />
          <OrderStatusBadge
            status={order.fulfillmentStatus}
            type="fulfillment"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items and totals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-pink-500" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    {item.variantTitle && (
                      <p className="text-muted-foreground text-sm">
                        {item.variantTitle}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-muted-foreground/60 text-xs">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency({
                        value: item.price,
                        currency: order.currency,
                      })}{' '}
                      × {item.quantity}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatCurrency({
                        value: item.total,
                        currency: order.currency,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatCurrency({
                    value: order.subtotal,
                    currency: order.currency,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {order.shippingTotal === 0
                    ? 'Free'
                    : formatCurrency({
                        value: order.shippingTotal,
                        currency: order.currency,
                      })}
                </span>
              </div>
              {order.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {formatCurrency({
                      value: order.taxTotal,
                      currency: order.currency,
                    })}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {formatCurrency({
                    value: order.total,
                    currency: order.currency,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-pink-500" />
              Payment
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="capitalize">
                  {order.paymentProvider || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-xs">
                  {order.paymentId || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid at</span>
                <span>{formatDate(order.paidAt, 'datetime')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-pink-500" />
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.email}</p>
              {order.shippingAddress && (
                <>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.firstName}{' '}
                    {order.shippingAddress.lastName}
                  </p>
                  {order.shippingAddress.phone && (
                    <p className="text-muted-foreground">
                      {order.shippingAddress.phone}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-pink-500" />
              Shipping
            </h2>
            {order.shippingAddress && (
              <div className="text-sm text-foreground/80 space-y-1">
                <p>
                  {order.shippingAddress.firstName}{' '}
                  {order.shippingAddress.lastName}
                </p>
                {order.shippingAddress.company && (
                  <p>{order.shippingAddress.company}</p>
                )}
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && (
                  <p>{order.shippingAddress.address2}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                  {order.shippingAddress.zip}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            )}
            {order.shippingMethod && (
              <p className="text-sm text-muted-foreground mt-3">
                Method: {order.shippingMethod}
              </p>
            )}
          </div>

          {/* Status update */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>

            {isCancelledOrder ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <OrderStatusBadge status="cancelled" type="order" />
                  <span>This order has been cancelled</span>
                </div>
                {order.cancelledAt && (
                  <p className="text-xs text-muted-foreground">
                    Cancelled on {formatDate(order.cancelledAt, 'datetime')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Order Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as OrderStatus)}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-destructive"
                      >
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Fulfillment
                  </label>
                  <Select
                    value={fulfillmentStatus}
                    onValueChange={(v) =>
                      setFulfillmentStatus(v as FulfillmentStatus)
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasChanges && (
                  <Button
                    onClick={handleSaveStatus}
                    disabled={isUpdating}
                    className={`w-full rounded-xl ${
                      status === 'cancelled'
                        ? 'bg-destructive hover:bg-destructive/90 text-white'
                        : 'bg-pink-500 hover:bg-pink-600 text-white'
                    }`}
                  >
                    {isUpdating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </span>
                    ) : status === 'cancelled' ? (
                      'Cancel Order...'
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Order History */}
          <OrderHistory entries={historyEntries} isLoading={isLoadingHistory} />
        </div>
      </div>

      {/* Cancellation Dialog */}
      <OrderCancellationDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelOrder}
        orderNumber={order.orderNumber}
        paymentStatus={order.paymentStatus}
        total={order.total}
        currency={order.currency}
        isLoading={isCancelling}
      />
    </div>
  )
}
