import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Package, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { OrderBulkActionsBar } from '../../../../components/admin/orders/OrderBulkActionsBar'
import { OrdersTable } from '../../../../components/admin/orders/OrdersTable'
import { OrderStatsCards } from '../../../../components/admin/orders/OrderStatsCards'
import { Button } from '../../../../components/ui/button'
import {
  getAdminOrdersFn,
  getOrderStatsFn,
  updateOrderStatusFn,
  bulkUpdateOrdersFn,
} from '../../../../server/orders'

import type { OrderStatus, FulfillmentStatus } from '../../../../types/checkout'

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

type StatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
type PaymentFilter = 'all' | 'pending' | 'paid' | 'failed' | 'refunded'
type FulfillmentFilter = 'all' | 'unfulfilled' | 'partial' | 'fulfilled'

const AdminOrdersPage = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  // Data loaded via route loader
  const { orders, total, stats } = Route.useLoaderData()

  const [search, setSearch] = useState(searchParams.q || '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  const page = searchParams.page || 1
  const limit = 10
  const status = searchParams.status || 'all'
  const paymentStatus = searchParams.paymentStatus || 'all'
  const fulfillmentStatus = searchParams.fulfillmentStatus || 'all'

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

  const handleQuickStatusChange = async (
    orderId: string,
    updates: { status?: OrderStatus; fulfillmentStatus?: FulfillmentStatus },
  ) => {
    setIsUpdating(true)
    try {
      await updateOrderStatusFn({
        data: {
          orderId,
          status: updates.status,
          fulfillmentStatus: updates.fulfillmentStatus,
        },
      })
      router.invalidate()
      toast.success(t('Order status updated'))
    } catch (err) {
      console.error('Failed to update order:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to update order status'),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkAction = async (actionType: string, value: string) => {
    if (selectedIds.size === 0) return

    setIsUpdating(true)
    try {
      await bulkUpdateOrdersFn({
        data: {
          ids: Array.from(selectedIds),
          action: actionType as
            | 'status'
            | 'paymentStatus'
            | 'fulfillmentStatus',
          value,
        },
      })
      router.invalidate()
      setSelectedIds(new Set())
      toast.success(t('{{count}} orders updated', { count: selectedIds.size }))
    } catch (err) {
      console.error('Failed to bulk update orders:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to update orders'),
      )
    } finally {
      setIsUpdating(false)
    }
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

      {/* Stats Cards */}
      {stats && (
        <div className="px-1">
          <OrderStatsCards stats={stats} isLoading={false} />
        </div>
      )}

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
      {orders.length === 0 ? (
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
        <OrdersTable
          orders={orders}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onQuickStatusChange={handleQuickStatusChange}
          isUpdating={isUpdating}
        />
      )}

      {/* Bulk Actions Bar */}
      <OrderBulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkAction={handleBulkAction}
        isLoading={isUpdating}
      />

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

export const Route = createFileRoute('/admin/_authed/orders/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    const page = search.page || 1
    const limit = 10
    const status = search.status || 'all'
    const paymentStatus = search.paymentStatus || 'all'
    const fulfillmentStatus = search.fulfillmentStatus || 'all'
    const sort = search.sort || 'createdAt'
    const order = search.order || 'desc'

    const [ordersResult, statsResult] = await Promise.all([
      getAdminOrdersFn({
        data: {
          page,
          limit,
          search: search.q,
          status,
          paymentStatus,
          fulfillmentStatus,
          sortKey: sort,
          sortOrder: order,
        },
      }),
      getOrderStatsFn(),
    ])

    return {
      orders: ordersResult.orders,
      total: ordersResult.total,
      stats: statsResult.stats,
    }
  },
  component: AdminOrdersPage,
})
