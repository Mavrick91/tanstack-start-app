import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, Package, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { OrderStatusBadge } from '../../../../components/admin/orders/OrderStatusBadge'
import { Separator } from '../../../../components/ui/separator'
import { formatCurrency } from '../../../../lib/format'
import { getCustomerOrderByIdFn } from '../../../../server/customers'

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
  shippingMethod?: string | null
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
  createdAt: Date
  items: Array<{
    id: string
    title: string
    variantTitle?: string | null
    price: number
    quantity: number
    total: number
    imageUrl?: string | null
  }>
}

const AccountOrderDetailPage = (): React.ReactNode => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const { t } = useTranslation()

  // Auth is handled by parent layout's beforeLoad
  // Data is loaded via route loader
  const { order } = Route.useLoaderData()

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!order) {
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
              <p className="text-red-400">{t('Order not found')}</p>
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
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0">
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

export const Route = createFileRoute('/$lang/account/orders/$orderId')({
  loader: async ({ params }) => {
    const data = await getCustomerOrderByIdFn({
      data: { orderId: params.orderId },
    })
    return { order: (data.order as OrderDetail) ?? null }
  },
  component: AccountOrderDetailPage,
})
