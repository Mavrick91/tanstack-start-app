import { Link, createFileRoute } from '@tanstack/react-router'
import { FolderOpen, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { BulkActionsBar } from '../../../../components/admin/collections/components/BulkActionsBar'
import {
  CollectionStats,
  type CollectionStatsData,
} from '../../../../components/admin/collections/components/CollectionStats'
import {
  CollectionTable,
  CollectionTableSkeleton,
} from '../../../../components/admin/collections/components/CollectionTable'
import { AdminPageHeader } from '../../../../components/admin/components/AdminPageHeader'
import { AdminPagination } from '../../../../components/admin/components/AdminPagination'
import { AdminSearchInput } from '../../../../components/admin/components/AdminSearchInput'
import { StatusFilterTabs } from '../../../../components/admin/components/StatusFilterTabs'
import { Button } from '../../../../components/ui/button'
import { useDataTable, type TableState } from '../../../../hooks/useDataTable'
import {
  getCollectionsFn,
  getCollectionStatsFn,
} from '../../../../server/collections'

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
  const { stats } = Route.useLoaderData()

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
      <AdminPageHeader
        title={t('Collections')}
        description={t('Manage your collections')}
        action={{
          label: t('Add Collection'),
          href: '/admin/collections/new',
        }}
      />

      {/* Stats Cards */}
      <div className="px-1">
        <CollectionStats stats={stats} />
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 px-1">
        <AdminSearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder={t('Search collections...')}
          ariaLabel={t('Search collections')}
        />
        <StatusFilterTabs
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => table.setFilter('status', value)}
          ariaLabel={t('Filter by status')}
        />
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

export const Route = createFileRoute('/admin/_authed/collections/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search }, context: { queryClient } }) => {
    const tableState = buildTableState(search)
    // Pre-fetch collections data and stats for SSR and link preloading
    const [, statsResult] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['collections', tableState],
        queryFn: () => fetchCollections(tableState),
      }),
      getCollectionStatsFn(),
    ])

    return {
      stats: statsResult.stats as CollectionStatsData,
    }
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
          {t('Add your first collection')}
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
