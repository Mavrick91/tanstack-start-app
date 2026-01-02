import { createFileRoute } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { AdminEmptyState } from '../../../../components/admin/components/AdminEmptyState'
import { AdminNoResults } from '../../../../components/admin/components/AdminNoResults'
import { AdminPageHeader } from '../../../../components/admin/components/AdminPageHeader'
import { AdminPagination } from '../../../../components/admin/components/AdminPagination'
import { AdminSearchInput } from '../../../../components/admin/components/AdminSearchInput'
import { StatusFilterTabs } from '../../../../components/admin/components/StatusFilterTabs'
import { BulkActionsBar } from '../../../../components/admin/products/components/BulkActionsBar'
import { ProductStats } from '../../../../components/admin/products/components/ProductStats'
import {
  ProductTable,
  ProductTableSkeleton,
} from '../../../../components/admin/products/components/ProductTable'
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
  const handleClearFilters = () => {
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
      <AdminPageHeader
        title={t('Product Catalog')}
        description={t('Manage your products')}
        action={{
          label: t('Add Product'),
          href: '/admin/products/new',
        }}
      />

      {/* Stats - fetched independently, always shows aggregate totals */}
      {stats && stats.totalProducts > 0 && <ProductStats stats={stats} />}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        <AdminSearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder={t('Search products...')}
          ariaLabel={t('Search products')}
        />
        <StatusFilterTabs
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => table.setFilter('status', value)}
          ariaLabel={t('Filter by status')}
        />
      </div>

      {/* Table / Empty / Loading */}
      {table.isLoading ? (
        <ProductTableSkeleton />
      ) : isEmptyCatalog ? (
        <AdminEmptyState
          icon={Package}
          title={t('No products yet')}
          description={t(
            'Start building your catalog by adding your first product.',
          )}
          actionLabel={t('Create First Product')}
          actionHref="/admin/products/new"
        />
      ) : isNoFilterResults ? (
        <AdminNoResults
          message={t('No products match your filters.')}
          onClear={handleClearFilters}
        />
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
          <AdminPagination
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
