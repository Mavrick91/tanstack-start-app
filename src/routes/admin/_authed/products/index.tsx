import { Link, createFileRoute } from '@tanstack/react-router'
import { Package, Plus, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { BulkActionsBar } from '../../../../components/admin/products/components/BulkActionsBar'
import { Pagination } from '../../../../components/admin/products/components/Pagination'
import { ProductStats } from '../../../../components/admin/products/components/ProductStats'
import {
  ProductTable,
  ProductTableSkeleton,
} from '../../../../components/admin/products/components/ProductTable'
import { Button } from '../../../../components/ui/button'
import { useDataTable, type TableState } from '../../../../hooks/useDataTable'
import { useProductStats } from '../../../../hooks/useProductStats'
import { fetchProducts } from '../../../../lib/api/products'

import type {
  Product,
  ProductStatus,
} from '../../../../components/admin/products/types'

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

// Build table state from search params
const buildTableState = (
  search: z.infer<typeof searchSchema>,
): TableState<SortKey> => ({
  search: search.q || '',
  page: search.page || 1,
  limit: 10,
  sortKey: search.sort || 'createdAt',
  sortOrder: search.order || 'desc',
  filters: {
    status: search.status || 'all',
  },
})

// Wrapper for fetchProducts for useDataTable
const fetchProductsForTable = async (state: {
  search: string
  page: number
  limit: number
  sortKey: string
  sortOrder: string
  filters: Record<string, string | undefined>
}): Promise<{
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}> => {
  const result = await fetchProducts(state)
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  }
}

const AdminProductsPage = (): React.ReactNode => {
  const { t } = useTranslation()
  const searchParams = Route.useSearch()

  // Separate query for stats - independent of table filtering
  const { data: stats } = useProductStats()

  const table = useDataTable<Product, SortKey>({
    id: 'products',
    routePath: '/admin/products',
    defaultSortKey: 'createdAt',
    defaultLimit: 10,
    queryFn: fetchProductsForTable,
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

  // Handler to clear both search and status filter
  const handleClearFilters = (): void => {
    table.setSearch('')
    table.setFilter('status', 'all')
  }

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

      {/* Stats - fetched independently, always shows aggregate totals */}
      {stats && stats.totalProducts > 0 && <ProductStats stats={stats} />}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            placeholder={t('Search products...')}
            className="w-full h-10 pl-10 pr-10 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all text-sm"
            aria-label={t('Search products')}
          />
          {table.search && (
            <button
              onClick={() => table.setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('Clear search')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div
          className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50"
          role="group"
          aria-label={t('Filter by status')}
        >
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => table.setFilter('status', opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={statusFilter === opt.value}
              aria-label={t('Filter by {{status}}', { status: opt.label })}
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
        <NoResults onClear={handleClearFilters} />
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

export const Route = createFileRoute('/admin/_authed/products/')({
  validateSearch: searchSchema,
  // Destructure individual params for proper change detection
  loaderDeps: ({ search }) => ({
    q: search.q,
    status: search.status,
    sort: search.sort,
    order: search.order,
    page: search.page,
  }),
  loader: async ({ deps, context: { queryClient } }) => {
    // Reconstruct search object from individual deps
    const search = {
      q: deps.q,
      status: deps.status,
      sort: deps.sort,
      order: deps.order,
      page: deps.page,
    }
    const tableState = buildTableState(search)
    // Pre-fetch products data for SSR and link preloading
    await queryClient.ensureQueryData({
      queryKey: ['products', tableState],
      queryFn: () => fetchProductsForTable(tableState),
    })
  },
  component: AdminProductsPage,
})

const EmptyState = (): React.ReactNode => {
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

export const NoResults = ({
  onClear,
}: {
  onClear: () => void
}): React.ReactNode => {
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
        aria-label={t('Clear filters')}
      >
        {t('Clear Filters')}
      </Button>
    </div>
  )
}
