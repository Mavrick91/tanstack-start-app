import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { OrderStatusBadge } from '../../../components/admin/orders/OrderStatusBadge'
import { Button } from '../../../components/ui/button'
import { formatCurrency } from '../../../lib/format'
import { getCustomerOrdersFn } from '../../../server/customers'

type OrderListItem = {
  id: string
  orderNumber: number
  total: number
  currency: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  createdAt: Date | string
  items: Array<{
    id: string
    title: string
    quantity: number
    imageUrl?: string | null
  }>
}

const AccountOrdersPage = (): React.ReactNode => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const { t } = useTranslation()

  // Auth is handled by parent layout's beforeLoad
  // Data is loaded via route loader
  const { orders } = Route.useLoaderData()

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/$lang/account"
              params={{ lang }}
              className="inline-flex items-center text-white/60 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('Back to account')}
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {t('Order History')}
            </h1>
          </div>

          {/* Orders list */}
          {orders.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">
                {t("You haven't placed any orders yet.")}
              </p>
              <Button asChild className="bg-white text-black hover:bg-white/90">
                <Link to="/$lang/products" params={{ lang }}>
                  {t('Start shopping')}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to="/$lang/account/orders/$orderId"
                  params={{ lang, orderId: order.id }}
                  className="block rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {t('Order')} #{order.orderNumber}
                      </p>
                      <p className="text-sm text-white/60">
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

                  {/* Order items preview */}
                  <div className="flex items-center gap-2 mb-4">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="w-12 h-12 rounded-lg overflow-hidden bg-white/10"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                            ?
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/60 text-sm">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}{' '}
                      {t('items')}
                    </p>
                    <p className="font-semibold text-white">
                      {formatCurrency({
                        value: order.total,
                        currency: order.currency,
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/$lang/account/orders')({
  loader: async () => {
    const data = await getCustomerOrdersFn({ data: { page: 1, limit: 50 } })
    return { orders: data.orders as OrderListItem[] }
  },
  component: AccountOrdersPage,
})
