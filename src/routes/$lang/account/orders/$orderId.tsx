import {
  createFileRoute,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { ArrowLeft, Loader2, Package, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { OrderStatusBadge } from '../../../../components/admin/orders/OrderStatusBadge'
import { Separator } from '../../../../components/ui/separator'
import { useAuthStore } from '../../../../hooks/useAuth'
import { formatCurrency } from '../../../../lib/format'
import { getCustomerOrdersFn } from '../../../../server/customers'

type OrderDetail = {
  id: string
  orderNumber: number
  email: string
  subtotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  currency: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  shippingMethod?: string
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    province?: string
    zip: string
    country: string
  }
  createdAt: string
  items: Array<{
    id: string
    title: string
    variantTitle?: string
    price: number
    quantity: number
    total: number
    imageUrl?: string
  }>
}

export const Route = createFileRoute('/$lang/account/orders/$orderId')({
  component: AccountOrderDetailPage,
})

function AccountOrderDetailPage() {
  const { lang, orderId } = useParams({ strict: false }) as {
    lang: string
    orderId: string
  }
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    isAuthenticated,
    isLoading: authLoading,
    checkSession,
  } = useAuthStore()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/$lang', params: { lang } })
      return
    }

    if (isAuthenticated && orderId) {
      getCustomerOrdersFn({ data: { page: 1, limit: 100 } })
        .then((data) => {
          const foundOrder = data.orders.find((o) => o.id === orderId) as
            | OrderDetail
            | undefined
          if (foundOrder) {
            setOrder(foundOrder)
          } else {
            setError('Order not found')
          }
        })
        .catch(() => setError('Failed to load order'))
        .finally(() => setIsLoading(false))
    }
  }, [authLoading, isAuthenticated, orderId, lang, navigate])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/$lang/account/orders"
              params={{ lang }}
              className="inline-flex items-center text-white/60 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Back to orders')}
            </Link>
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-8 text-center">
              <p className="text-red-400">{error || 'Order not found'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/$lang/account/orders"
              params={{ lang }}
              className="inline-flex items-center text-white/60 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Back to orders')}
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {t('Order')} #{order.orderNumber}
                </h1>
                <p className="text-white/60 mt-1">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge
                  status={
                    order.status as
                      | 'pending'
                      | 'processing'
                      | 'shipped'
                      | 'delivered'
                      | 'cancelled'
                  }
                  type="order"
                />
                <OrderStatusBadge
                  status={
                    order.fulfillmentStatus as
                      | 'unfulfilled'
                      | 'partial'
                      | 'fulfilled'
                  }
                  type="fulfillment"
                />
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('Items')}
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{item.title}</p>
                    {item.variantTitle && (
                      <p className="text-white/60 text-sm">
                        {item.variantTitle}
                      </p>
                    )}
                    <p className="text-white/60 text-sm">
                      {t('Qty')}: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {formatCurrency({
                        value: item.total,
                        currency: order.currency,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-white/10 my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('Subtotal')}</span>
                <span className="text-white">
                  {formatCurrency({
                    value: order.subtotal,
                    currency: order.currency,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('Shipping')}</span>
                <span className="text-white">
                  {order.shippingTotal === 0
                    ? t('Free')
                    : formatCurrency({
                        value: order.shippingTotal,
                        currency: order.currency,
                      })}
                </span>
              </div>
              {order.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{t('Tax')}</span>
                  <span className="text-white">
                    {formatCurrency({
                      value: order.taxTotal,
                      currency: order.currency,
                    })}
                  </span>
                </div>
              )}
              <Separator className="bg-white/10 my-2" />
              <div className="flex justify-between">
                <span className="text-white font-semibold">{t('Total')}</span>
                <span className="text-white font-semibold">
                  {formatCurrency({
                    value: order.total,
                    currency: order.currency,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {t('Shipping')}
            </h2>
            <div className="text-white/80 space-y-1">
              <p>
                {order.shippingAddress.firstName}{' '}
                {order.shippingAddress.lastName}
              </p>
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
            {order.shippingMethod && (
              <p className="text-white/60 mt-3 text-sm">
                {t('Method')}: {order.shippingMethod}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
