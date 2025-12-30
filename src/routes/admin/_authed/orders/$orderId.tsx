import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { OrderDetail } from '../../../../components/admin/orders/OrderDetail'
import { type OrderHistoryEntry } from '../../../../components/admin/orders/OrderHistory'
import { Button } from '../../../../components/ui/button'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../../types/checkout'
import type { Order } from '../../../../types/order'

export const Route = createFileRoute('/admin/_authed/orders/$orderId')({
  component: AdminOrderDetailPage,
})

async function fetchOrder(orderId: string): Promise<Order> {
  const response = await fetch(`/api/orders/${orderId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch order')
  }

  const data = await response.json()
  return data.order
}

async function updateOrderStatus(
  orderId: string,
  updates: {
    status?: OrderStatus
    paymentStatus?: PaymentStatus
    fulfillmentStatus?: FulfillmentStatus
    reason?: string
  },
) {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to update order')
  }

  return await response.json()
}

async function fetchOrderHistory(
  orderId: string,
): Promise<OrderHistoryEntry[]> {
  const response = await fetch(`/api/orders/${orderId}/history`, {
    credentials: 'include',
  })

  if (!response.ok) {
    // History might not be available yet, return empty
    return []
  }

  const data = await response.json()
  return data.history || []
}

function AdminOrderDetailPage() {
  const { t } = useTranslation()
  const { orderId } = Route.useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyEntries, setHistoryEntries] = useState<OrderHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchOrder(orderId)
        setOrder(data)
      } catch (err) {
        console.error('Failed to fetch order:', err)
        setError(err instanceof Error ? err.message : 'Failed to load order')
      } finally {
        setIsLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  // Load history separately (non-blocking)
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const history = await fetchOrderHistory(orderId)
        setHistoryEntries(history)
      } catch (err) {
        console.error('Failed to fetch order history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadHistory()
  }, [orderId])

  const handleUpdateStatus = async (updates: {
    status?: OrderStatus
    paymentStatus?: PaymentStatus
    fulfillmentStatus?: FulfillmentStatus
    reason?: string
  }) => {
    if (!Object.values(updates).some(Boolean)) return

    try {
      const result = await updateOrderStatus(orderId, updates)

      // Update local state with new values
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: result.order.status ?? prev.status,
              paymentStatus: result.order.paymentStatus ?? prev.paymentStatus,
              fulfillmentStatus:
                result.order.fulfillmentStatus ?? prev.fulfillmentStatus,
              updatedAt: result.order.updatedAt,
              cancelledAt: result.order.cancelledAt ?? prev.cancelledAt,
            }
          : null,
      )

      // Show appropriate success message
      if (updates.status === 'cancelled') {
        if (result.refundResult?.success) {
          toast.success(t('Order cancelled and refund processed'))
        } else if (result.refundResult?.error) {
          toast.success(t('Order cancelled'), {
            description: `Refund failed: ${result.refundResult.error}`,
          })
        } else {
          toast.success(t('Order cancelled'))
        }
      } else {
        toast.success(t('Order status updated'))
      }

      // Refresh history after status change
      const history = await fetchOrderHistory(orderId)
      setHistoryEntries(history)
    } catch (err) {
      console.error('Failed to update order:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to update order status'),
      )
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Link to="/admin/orders">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('Back to Orders')}
          </Button>
        </Link>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-destructive">{error || t('Order not found')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Link to="/admin/orders">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('Back to Orders')}
        </Button>
      </Link>

      <OrderDetail
        order={order}
        onUpdateStatus={handleUpdateStatus}
        historyEntries={historyEntries}
        isLoadingHistory={isLoadingHistory}
      />
    </div>
  )
}
