import { Link, createFileRoute } from '@tanstack/react-router'
import { Package, Plus, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { BulkActionsBar } from '../../../components/admin/products/components/BulkActionsBar'
import { Pagination } from '../../../components/admin/products/components/Pagination'
import { ProductStats } from '../../../components/admin/products/components/ProductStats'
import {
  ProductTable,
  ProductTableSkeleton,
} from '../../../components/admin/products/components/ProductTable'
import { Button } from '../../../components/ui/button'
import { useDataTable } from '../../../hooks/useDataTable'

import type {
  Product,
  ProductStatus,
} from '../../../components/admin/products/types'

// URL search params schema
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['all', 'active', 'draft', 'archived']).optional(),
  sort: z
    .enum(['name', 'price', 'inventory', 'status', 'createdAt'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
})

type SortKey = 'name' | 'price' | 'inventory' | 'status' | 'createdAt'

export const Route = createFileRoute('/admin/products/')({
  component: AdminProductsPage,
  validateSearch: searchSchema,
})

// API fetcher for useDataTable
async function fetchProducts(state: {
  search: string
  page: number
  limit: number
  sortKey: string
  sortOrder: string
  filters: Record<string, string | undefined>
}) {
  const params = new URLSearchParams()
  params.set('page', String(state.page))
  params.set('limit', String(state.limit))
  if (state.search) params.set('q', state.search)
  if (state.filters.status && state.filters.status !== 'all') {
    params.set('status', state.filters.status)
  }
  if (state.sortKey) params.set('sort', state.sortKey)
  if (state.sortOrder) params.set('order', state.sortOrder)

  const res = await fetch(`/api/products?${params.toString()}`, {
    credentials: 'include',
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)

  return {
    data: json.products as Product[],
    total: json.total as number,
    page: json.page as number,
    limit: json.limit as number,
    totalPages: json.totalPages as number,
  }
}

function AdminProductsPage() {
  const { t } = useTranslation()
  const searchParams = Route.useSearch()

  const table = useDataTable<Product, SortKey>({
    id: 'products',
    routePath: '/admin/products',
    defaultSortKey: 'createdAt',
    defaultLimit: 10,
    queryFn: fetchProducts,
    initialState: {
      search: searchParams.q || '',
      page: searchParams.page || 1,
      sortKey: searchParams.sort || 'createdAt',
      sortOrder: searchParams.order || 'desc',
      filters: {
        status: searchParams.status || 'all',
      },
    },
  })

  const statusFilter = (table.filters.status || 'all') as ProductStatus | 'all'

  // Determine empty state type
  const isEmptyCatalog =
    !table.isLoading &&
    table.total === 0 &&
    !table.search &&
    statusFilter === 'all'
  const isNoFilterResults =
    !table.isLoading && table.items.length === 0 && !isEmptyCatalog

  if (table.error) {
    return (
      <div className="text-center py-24 bg-card rounded-2xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-1">
          {t('Failed to load catalog')}
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          {t('Please check your connection or try logging in again.')}
        </p>
      </div>
    )
  }

  const statusOptions: { value: ProductStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'active', label: t('Active') },
    { value: 'draft', label: t('Draft') },
    { value: 'archived', label: t('Archived') },
  ]

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('Product Catalog')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('Manage your products and inventory')}
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm font-semibold gap-2">
            <Plus className="w-4 h-4" />
            {t('Add Product')}
          </Button>
        </Link>
      </div>

      {/* Stats - only show when we have products */}
      {!table.isLoading && table.total > 0 && (
        <ProductStats products={table.items} />
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            placeholder={t('Search products...')}
            className="w-full h-10 pl-10 pr-10 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm"
          />
          {table.search && (
            <button
              onClick={() => table.setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => table.setFilter('status', opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Empty / Loading */}
      {table.isLoading ? (
        <ProductTableSkeleton />
      ) : isEmptyCatalog ? (
        <EmptyState />
      ) : isNoFilterResults ? (
        <NoResults onClear={() => table.setSearch('')} />
      ) : (
        <>
          <ProductTable
            products={table.items}
            selectedIds={table.selectedIds}
            onToggleSelect={table.toggleSelect}
            onToggleSelectAll={table.toggleSelectAll}
            isAllSelected={table.isAllSelected}
            isSomeSelected={table.isSomeSelected}
            sortKey={table.sortKey}
            sortOrder={table.sortOrder}
            onSort={table.handleSort}
          />
          <Pagination
            currentPage={table.page}
            totalPages={table.totalPages}
            totalItems={table.total}
            onPageChange={table.setPage}
          />
        </>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={table.selectedCount}
        selectedIds={table.selectedIds}
        onClearSelection={table.clearSelection}
      />
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="text-center py-20 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="w-14 h-14 bg-pink-500/5 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Package className="w-7 h-7 text-pink-500/40" />
      </div>
      <h3 className="text-lg font-bold mb-1">{t('No products yet')}</h3>
      <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">
        {t('Start building your catalog by adding your first product.')}
      </p>
      <Link to="/admin/products/new">
        <Button variant="outline" className="rounded-xl h-9 px-5 font-semibold">
          {t('Create First Product')}
        </Button>
      </Link>
    </div>
  )
}

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16 bg-card border border-border/50 rounded-2xl shadow-sm">
      <p className="text-muted-foreground text-sm mb-3">
        {t('No products match your filters.')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={onClear}
      >
        {t('Clear Search')}
      </Button>
    </div>
  )
}
