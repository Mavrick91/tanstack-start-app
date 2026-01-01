import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'

export type SortOrder = 'asc' | 'desc'

export interface TableState<TSortKey extends string = string> {
  search: string
  page: number
  limit: number
  sortKey: TSortKey
  sortOrder: SortOrder
  filters: Record<string, string | undefined>
}

export interface TableResponse<TData, TExtra = unknown> {
  data: TData[]
  total: number
  page: number
  limit: number
  totalPages: number
  extra?: TExtra
}

export interface UseDataTableOptions<TData, TSortKey extends string = string> {
  id: string
  queryFn: (state: TableState<TSortKey>) => Promise<TableResponse<TData>>
  initialState?: Partial<TableState<TSortKey>>
  routePath?: string
  defaultSortKey: TSortKey
  defaultLimit?: number
}

export const useDataTable = <
  TData extends { id: string },
  TSortKey extends string = string,
>(
  options: UseDataTableOptions<TData, TSortKey>,
) => {
  const {
    id,
    queryFn,
    initialState = {},
    routePath,
    defaultSortKey,
    defaultLimit = 10,
  } = options

  const navigate = useNavigate()

  // When routePath is provided, state comes from initialState (URL search params)
  // When no routePath, use local state for backwards compatibility
  const [localSearch, setLocalSearch] = useState(initialState.search || '')
  const [localPage, setLocalPage] = useState(initialState.page || 1)
  const [localSortKey, setLocalSortKey] = useState<TSortKey>(
    initialState.sortKey || defaultSortKey,
  )
  const [localSortOrder, setLocalSortOrder] = useState<SortOrder>(
    initialState.sortOrder || 'desc',
  )
  const [localFilters, setLocalFilters] = useState<
    Record<string, string | undefined>
  >(initialState.filters || {})

  // Use URL-derived state when routePath is provided, otherwise use local state
  const search = routePath ? initialState.search || '' : localSearch
  const page = routePath ? initialState.page || 1 : localPage
  const limit = initialState.limit || defaultLimit
  const sortKey = routePath
    ? initialState.sortKey || defaultSortKey
    : localSortKey
  const sortOrder = routePath
    ? initialState.sortOrder || 'desc'
    : localSortOrder

  const filters = useMemo(
    () => (routePath ? initialState.filters || {} : localFilters),
    [routePath, initialState.filters, localFilters],
  )

  // Selection state remains local (not persisted in URL)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const tableState: TableState<TSortKey> = useMemo(
    () => ({
      search,
      page,
      limit,
      sortKey,
      sortOrder,
      filters,
    }),
    [search, page, limit, sortKey, sortOrder, filters],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [id, tableState],
    queryFn: () => queryFn(tableState),
  })

  const items = useMemo(() => data?.data || [], [data?.data])
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1
  const extra = data?.extra

  // Helper to build URL search params from current state
  const buildSearchParams = useCallback(
    (updates: Partial<TableState<TSortKey>>) => {
      const newState = {
        search: updates.search ?? search,
        page: updates.page ?? page,
        sortKey: updates.sortKey ?? sortKey,
        sortOrder: updates.sortOrder ?? sortOrder,
        filters: updates.filters ?? filters,
      }

      const params: Record<string, string | number | undefined> = {}
      if (newState.search) params.q = newState.search
      if (newState.page > 1) params.page = newState.page
      if (newState.sortKey !== defaultSortKey) params.sort = newState.sortKey
      if (newState.sortOrder !== 'desc') params.order = newState.sortOrder

      Object.entries(newState.filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params[key] = value
        }
      })

      return params
    },
    [search, page, sortKey, sortOrder, filters, defaultSortKey],
  )

  const setSearch = useCallback(
    (value: string) => {
      if (routePath) {
        const params = buildSearchParams({ search: value, page: 1 })
        navigate({ to: routePath, search: params, replace: true })
      } else {
        setLocalSearch(value)
        setLocalPage(1)
      }
    },
    [routePath, buildSearchParams, navigate],
  )

  const setPage = useCallback(
    (value: number) => {
      if (routePath) {
        const params = buildSearchParams({ page: value })
        navigate({ to: routePath, search: params, replace: true })
      } else {
        setLocalPage(value)
      }
    },
    [routePath, buildSearchParams, navigate],
  )

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      if (routePath) {
        const newFilters = { ...filters, [key]: value }
        const params = buildSearchParams({ filters: newFilters, page: 1 })
        navigate({ to: routePath, search: params, replace: true })
      } else {
        setLocalFilters((prev) => ({ ...prev, [key]: value }))
        setLocalPage(1)
      }
    },
    [routePath, filters, buildSearchParams, navigate],
  )

  const handleSort = useCallback(
    (key: TSortKey) => {
      const newSortOrder =
        key === sortKey ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
      const newSortKey = key

      if (routePath) {
        const params = buildSearchParams({
          sortKey: newSortKey,
          sortOrder: newSortOrder,
          page: 1,
        })
        navigate({ to: routePath, search: params, replace: true })
      } else {
        setLocalSortKey(newSortKey)
        setLocalSortOrder(newSortOrder)
        setLocalPage(1)
      }
    },
    [routePath, sortKey, sortOrder, buildSearchParams, navigate],
  )

  const toggleSelect = useCallback((rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const currentIds = items.map((item) => item.id)
    const allSelected =
      currentIds.length > 0 &&
      currentIds.every((itemId) => selectedIds.has(itemId))

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentIds.forEach((itemId) => next.delete(itemId))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentIds.forEach((itemId) => next.add(itemId))
        return next
      })
    }
  }, [items, selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false
    return items.every((item) => selectedIds.has(item.id))
  }, [items, selectedIds])

  const isSomeSelected = useMemo(() => {
    return items.some((item) => selectedIds.has(item.id))
  }, [items, selectedIds])

  return {
    items,
    total,
    totalPages,
    extra,
    isLoading,
    error,
    refetch,
    search,
    setSearch,
    page,
    setPage,
    limit,
    sortKey,
    sortOrder,
    handleSort,
    filters,
    setFilter,
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  }
}
