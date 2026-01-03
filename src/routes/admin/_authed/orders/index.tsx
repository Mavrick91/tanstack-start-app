import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { AdminPageHeader } from '../../../../components/admin/components/AdminPageHeader'
import { AdminPagination } from '../../../../components/admin/components/AdminPagination'
import { AdminSearchInput } from '../../../../components/admin/components/AdminSearchInput'
import { StatusFilterTabs } from '../../../../components/admin/components/StatusFilterTabs'
import { OrderBulkActionsBar } from '../../../../components/admin/orders/OrderBulkActionsBar'
import { OrdersTable } from '../../../../components/admin/orders/OrdersTable'
import { OrderStatsCards } from '../../../../components/admin/orders/OrderStatsCards'
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
  const sortKey = searchParams.sort || 'createdAt'
  const sortOrder = searchParams.order || 'desc'

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

  const handleSort = (key: string) => {
    const newOrder = key === sortKey && sortOrder === 'asc' ? 'desc' : 'asc'
    updateSearch({ sort: key, order: newOrder })
  }

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
    { value: 'partial', label: t('Partial') },
    { value: 'fulfilled', label: t('Fulfilled') },
  ]

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title={t('Orders')}
        description={t('Manage your orders')}
      />

      {/* Stats Cards */}
      {stats && <OrderStatsCards stats={stats} isLoading={false} />}

      {/* Search */}
      <AdminSearchInput
        value={search}
        onChange={(value) => {
          setSearch(value)
          updateSearch({ q: value || undefined })
        }}
        placeholder={t('Search by email or order number...')}
        ariaLabel={t('Search orders')}
        className="max-w-md"
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {t('Status')}
          </span>
          <StatusFilterTabs
            options={statusOptions}
            value={status}
            onChange={(value) => updateSearch({ status: value })}
            ariaLabel={t('Filter by status')}
          />
        </div>

        <div className="w-px h-12 bg-border/50 self-end mb-1" />

        {/* Payment filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {t('Payment')}
          </span>
          <StatusFilterTabs
            options={paymentOptions}
            value={paymentStatus}
            onChange={(value) => updateSearch({ paymentStatus: value })}
            ariaLabel={t('Filter by payment')}
          />
        </div>

        <div className="w-px h-12 bg-border/50 self-end mb-1" />

        {/* Fulfillment filter */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {t('Fulfillment')}
          </span>
          <StatusFilterTabs
            options={fulfillmentOptions}
            value={fulfillmentStatus}
            onChange={(value) => updateSearch({ fulfillmentStatus: value })}
            ariaLabel={t('Filter by fulfillment')}
          />
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
          sortKey={
            sortKey as
              | 'orderNumber'
              | 'total'
              | 'status'
              | 'paymentStatus'
              | 'createdAt'
          }
          sortOrder={sortOrder as 'asc' | 'desc'}
          onSort={handleSort}
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
      <AdminPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(newPage) => updateSearch({ page: newPage })}
        itemsPerPage={limit}
      />
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
