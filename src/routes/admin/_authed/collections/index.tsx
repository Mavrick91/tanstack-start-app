import { Link, createFileRoute } from '@tanstack/react-router'
import { FolderOpen, Plus, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { BulkActionsBar } from '../../../../components/admin/collections/components/BulkActionsBar'
import {
  CollectionTable,
  CollectionTableSkeleton,
} from '../../../../components/admin/collections/components/CollectionTable'
import { Pagination } from '../../../../components/admin/products/components/Pagination'
import { Button } from '../../../../components/ui/button'
import { useDataTable, type TableState } from '../../../../hooks/useDataTable'
import { getCollectionsFn } from '../../../../server/collections'

import type { CollectionListItem } from '../../../../components/admin/collections/types'

// URL Search Params Schema
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['all', 'active', 'draft']).optional(),
  sort: z.enum(['name', 'productCount', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
})

type SortKey = 'name' | 'productCount' | 'createdAt'

// Build table state from search params
const buildTableState = (
  search: z.infer<typeof searchSchema>,
): TableState<SortKey> => ({
  search: search.q || '',
  page: search.page || 1,
  limit: 10,
  sortKey: (search.sort as SortKey) || 'createdAt',
  sortOrder: search.order || 'desc',
  filters: {
    status: search.status || 'all',
  },
})

// Fetcher using server function
const fetchCollections = async (state: {
  search: string
  page: number
  limit: number
  sortKey: string
  sortOrder: string
  filters: Record<string, string | undefined>
}) => {
  const result = await getCollectionsFn({
    data: {
      page: state.page,
      limit: state.limit,
      search: state.search,
      status: (state.filters.status as 'all' | 'active' | 'draft') || 'all',
      sortKey: state.sortKey as SortKey,
      sortOrder: state.sortOrder as 'asc' | 'desc',
    },
  })

  if (!result.success) throw new Error('Failed to fetch collections')

  return {
    data: result.data as CollectionListItem[], // Cast to ensure type compatibility
    total: result.total as number,
    page: result.page as number,
    limit: result.limit as number,
    totalPages: result.totalPages as number,
  }
}

const CollectionsPage = () => {
  const { t } = useTranslation()
  const searchParams = Route.useSearch()

  const table = useDataTable<CollectionListItem, SortKey>({
    id: 'collections',
    routePath: '/admin/collections',
    defaultSortKey: 'createdAt',
    defaultLimit: 10,
    queryFn: fetchCollections,
    initialState: {
      search: searchParams.q || '',
      page: searchParams.page || 1,
      sortKey: (searchParams.sort as SortKey) || 'createdAt',
      sortOrder: (searchParams.order as 'asc' | 'desc') || 'desc',
      filters: {
        status: searchParams.status || 'all',
      },
    },
  })

  const statusFilter = (table.filters.status || 'all') as
    | 'all'
    | 'active'
    | 'draft'

  const isEmptyCatalog =
    !table.isLoading &&
    table.total === 0 &&
    !table.search &&
    statusFilter === 'all'

  const isNoFilterResults =
    !table.isLoading && table.items.length === 0 && !isEmptyCatalog

  if (table.error) {
    return (
      <div className="text-center py-24 bg-card rounded-3xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-1">
          {t('Failed to load collections')}
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          {t('Please check your connection or try logging in again.')}
        </p>
      </div>
    )
  }

  const statusOptions: { value: 'all' | 'active' | 'draft'; label: string }[] =
    [
      { value: 'all', label: t('All') },
      { value: 'active', label: t('Active') },
      { value: 'draft', label: t('Draft') },
    ]

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('Collections')}
          </h1>
          <p className="text-muted-foreground font-medium text-sm">
            {t('Curate and organize your products for the storefront')}
          </p>
        </div>
        <Link to="/admin/collections/new">
          <Button className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm font-semibold gap-2 transition-all">
            <Plus className="w-4 h-4" />
            {t('Create Collection')}
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            placeholder={t('Search collections...')}
            className="w-full h-11 pl-11 pr-4 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/10 transition-all font-medium text-sm shadow-sm"
          />
          {table.search && (
            <button
              onClick={() => table.setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50 h-11 items-center">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => table.setFilter('status', opt.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all h-9 ${
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

      {/* Collections Table */}
      {table.isLoading ? (
        <CollectionTableSkeleton />
      ) : isEmptyCatalog ? (
        <EmptyState />
      ) : isNoFilterResults ? (
        <NoResults onClear={() => table.setSearch('')} />
      ) : (
        <>
          <CollectionTable
            collections={table.items}
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

export const Route = createFileRoute('/admin/_authed/collections/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const tableState = buildTableState(search)
    // Pre-fetch collections data for SSR and link preloading
    await queryClient.ensureQueryData({
      queryKey: ['collections', tableState],
      queryFn: () => fetchCollections(tableState),
    })
  },
  component: CollectionsPage,
})

const EmptyState = () => {
  const { t } = useTranslation()
  return (
    <div className="text-center py-24 bg-card border border-border/50 rounded-3xl shadow-sm">
      <div className="w-16 h-16 bg-pink-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="w-8 h-8 text-pink-500/40" />
      </div>
      <h3 className="text-xl font-bold mb-1">
        {t('Your collection gallery is empty')}
      </h3>
      <p className="text-muted-foreground text-xs font-medium mb-6 max-w-xs mx-auto">
        {t('Start curating your products into beautiful, themed collections.')}
      </p>
      <Link to="/admin/collections/new">
        <Button
          variant="outline"
          className="rounded-xl h-10 px-6 font-semibold"
        >
          {t('Create your first collection')}
        </Button>
      </Link>
    </div>
  )
}

const NoResults = ({ onClear }: { onClear: () => void }) => {
  const { t } = useTranslation()
  return (
    <div className="text-center py-20 bg-card border border-border/50 rounded-3xl shadow-sm">
      <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border/50">
        <Search className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-bold mb-1">{t('No collections found.')}</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t('No products match your filters.')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl px-5"
        onClick={onClear}
      >
        {t('Clear Search')}
      </Button>
    </div>
  )
}
