import { createFileRoute } from '@tanstack/react-router'
import { Package, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { OrdersTable } from '../../../components/admin/orders/OrdersTable'
import { Button } from '../../../components/ui/button'

import type { OrderListItem } from '../../../types/order'

const searchSchema = z.object({
  q: z.string().optional(),
  status: z
    .enum(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  paymentStatus: z
    .enum(['all', 'pending', 'paid', 'failed', 'refunded'])
    .optional(),
  fulfillmentStatus: z
    .enum(['all', 'unfulfilled', 'partial', 'fulfilled'])
    .optional(),
  sort: z
    .enum(['orderNumber', 'total', 'status', 'paymentStatus', 'createdAt'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
})

export const Route = createFileRoute('/admin/orders/')({
  component: AdminOrdersPage,
  validateSearch: searchSchema,
})

async function fetchOrders(params: {
  search: string
  page: number
  limit: number
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  sort: string
  order: string
}) {
  const searchParams = new URLSearchParams()
  searchParams.set('page', params.page.toString())
  searchParams.set('limit', params.limit.toString())
  searchParams.set('sort', params.sort)
  searchParams.set('order', params.order)

  if (params.search) searchParams.set('q', params.search)
  if (params.status && params.status !== 'all')
    searchParams.set('status', params.status)
  if (params.paymentStatus && params.paymentStatus !== 'all')
    searchParams.set('paymentStatus', params.paymentStatus)
  if (params.fulfillmentStatus && params.fulfillmentStatus !== 'all')
    searchParams.set('fulfillmentStatus', params.fulfillmentStatus)

  const response = await fetch(`/api/orders?${searchParams.toString()}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }

  return await response.json()
}

type StatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
type PaymentFilter = 'all' | 'pending' | 'paid' | 'failed' | 'refunded'
type FulfillmentFilter = 'all' | 'unfulfilled' | 'partial' | 'fulfilled'

function AdminOrdersPage() {
  const { t } = useTranslation()
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.q || '')

  const page = searchParams.page || 1
  const limit = 10
  const status = searchParams.status || 'all'
  const paymentStatus = searchParams.paymentStatus || 'all'
  const fulfillmentStatus = searchParams.fulfillmentStatus || 'all'
  const sort = searchParams.sort || 'createdAt'
  const order = searchParams.order || 'desc'

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true)
      try {
        const result = await fetchOrders({
          search: searchParams.q || '',
          page,
          limit,
          status,
          paymentStatus,
          fulfillmentStatus,
          sort,
          order,
        })
        setOrders(result.orders)
        setTotal(result.total)
      } catch (err) {
        console.error('Failed to fetch orders:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadOrders()
  }, [
    searchParams,
    page,
    status,
    paymentStatus,
    fulfillmentStatus,
    sort,
    order,
  ])

  const updateSearch = (
    updates: Record<string, string | number | undefined>,
  ) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
        page: updates.page ?? 1,
      }),
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearch({ q: search || undefined })
  }

  const clearSearch = () => {
    setSearch('')
    updateSearch({ q: undefined })
  }

  const totalPages = Math.ceil(total / limit)

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'pending', label: t('Pending') },
    { value: 'processing', label: t('Processing') },
    { value: 'shipped', label: t('Shipped') },
    { value: 'delivered', label: t('Delivered') },
    { value: 'cancelled', label: t('Cancelled') },
  ]

  const paymentOptions: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'pending', label: t('Pending') },
    { value: 'paid', label: t('Paid') },
    { value: 'failed', label: t('Failed') },
    { value: 'refunded', label: t('Refunded') },
  ]

  const fulfillmentOptions: { value: FulfillmentFilter; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'unfulfilled', label: t('Unfulfilled') },
    { value: 'fulfilled', label: t('Fulfilled') },
  ]

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Orders')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('Manage and track customer orders')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search by email or order number...')}
            className="w-full h-10 pl-10 pr-10 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm"
            aria-label={t('Search orders')}
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('Clear search')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Status filter */}
        <div
          className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50"
          role="group"
          aria-label={t('Filter by status')}
        >
          {statusOptions.slice(0, 4).map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSearch({ status: opt.value })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                status === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={status === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Payment filter */}
        <div
          className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50"
          role="group"
          aria-label={t('Filter by payment')}
        >
          {paymentOptions.slice(0, 3).map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSearch({ paymentStatus: opt.value })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                paymentStatus === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={paymentStatus === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Fulfillment filter */}
        <div
          className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50"
          role="group"
          aria-label={t('Filter by fulfillment')}
        >
          {fulfillmentOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSearch({ fulfillmentStatus: opt.value })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                fulfillmentStatus === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={fulfillmentStatus === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      {isLoading ? (
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm">
          <div className="animate-pulse text-muted-foreground">
            {t('Loading orders...')}
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-2xl shadow-sm">
          <div className="w-14 h-14 bg-pink-500/5 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-pink-500/40" />
          </div>
          <h3 className="text-lg font-bold mb-1">{t('No orders yet')}</h3>
          <p className="text-muted-foreground text-xs max-w-xs mx-auto">
            {t(
              'Orders will appear here when customers complete their purchases.',
            )}
          </p>
        </div>
      ) : (
        <OrdersTable orders={orders} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {t('Showing')} {(page - 1) * limit + 1} {t('to')}{' '}
            {Math.min(page * limit, total)} {t('of')} {total} {t('orders')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateSearch({ page: page - 1 })}
              className="rounded-lg"
            >
              {t('Previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('Page')} {page} {t('of')} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateSearch({ page: page + 1 })}
              className="rounded-lg"
            >
              {t('Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
