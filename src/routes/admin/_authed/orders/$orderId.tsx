import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { OrderDetail } from '../../../../components/admin/orders/OrderDetail'
import { Button } from '../../../../components/ui/button'
import {
  getAdminOrderFn,
  updateOrderStatusFn,
  getOrderHistoryFn,
} from '../../../../server/orders'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../../types/checkout'

const OrderErrorComponent = ({ error }: { error: Error }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <Link to="/admin/orders">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('Back to Orders')}
        </Button>
      </Link>
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-destructive">
          {error instanceof Error ? error.message : t('Order not found')}
        </p>
      </div>
    </div>
  )
}

const AdminOrderDetailPage = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { order, history } = Route.useLoaderData()

  const handleUpdateStatus = async (updates: {
    status?: OrderStatus
    paymentStatus?: PaymentStatus
    fulfillmentStatus?: FulfillmentStatus
    reason?: string
  }) => {
    if (!Object.values(updates).some(Boolean)) return

    try {
      const result = await updateOrderStatusFn({
        data: {
          orderId: order.id,
          status: updates.status,
          paymentStatus: updates.paymentStatus,
          fulfillmentStatus: updates.fulfillmentStatus,
          reason: updates.reason,
        },
      })

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

      // Invalidate and refetch to get fresh data
      router.invalidate()
    } catch (err) {
      console.error('Failed to update order:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to update order status'),
      )
      throw err
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Link to="/admin/orders">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('Back to Orders')}
        </Button>
      </Link>

      <OrderDetail
        order={order}
        onUpdateStatus={handleUpdateStatus}
        historyEntries={history}
        isLoadingHistory={false}
      />
    </div>
  )
}

export const Route = createFileRoute('/admin/_authed/orders/$orderId')({
  loader: async ({ params }) => {
    const [orderResult, historyResult] = await Promise.all([
      getAdminOrderFn({ data: { orderId: params.orderId } }),
      getOrderHistoryFn({ data: { orderId: params.orderId } }),
    ])

    if (!orderResult.order) {
      throw new Error('Order not found')
    }

    return {
      order: orderResult.order,
      history: historyResult.history || [],
    }
  },
  errorComponent: OrderErrorComponent,
  pendingComponent: () => (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
    </div>
  ),
  component: AdminOrderDetailPage,
})
