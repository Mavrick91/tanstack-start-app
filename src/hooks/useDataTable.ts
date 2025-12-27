import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SortOrder = 'asc' | 'desc'

export interface TableState<TSortKey extends string = string> {
  search: string
  page: number
  limit: number
  sortKey: TSortKey
  sortOrder: SortOrder
  filters: Record<string, string | undefined>
}

export interface TableResponse<TData> {
  data: TData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UseDataTableOptions<TData, TSortKey extends string = string> {
  id: string
  queryFn: (state: TableState<TSortKey>) => Promise<TableResponse<TData>>
  initialState?: Partial<TableState<TSortKey>>
  routePath?: string
  defaultSortKey: TSortKey
  defaultLimit?: number
}

export function useDataTable<
  TData extends { id: string },
  TSortKey extends string = string,
>(options: UseDataTableOptions<TData, TSortKey>) {
  const {
    id,
    queryFn,
    initialState = {},
    routePath,
    defaultSortKey,
    defaultLimit = 10,
  } = options

  const navigate = useNavigate()
  const isInitialMount = useRef(true)

  const [search, setSearchState] = useState(initialState.search || '')
  const [page, setPageState] = useState(initialState.page || 1)
  const [limit] = useState(initialState.limit || defaultLimit)
  const [sortKey, setSortKeyState] = useState<TSortKey>(
    initialState.sortKey || defaultSortKey,
  )
  const [sortOrder, setSortOrderState] = useState<SortOrder>(
    initialState.sortOrder || 'desc',
  )
  const [filters, setFiltersState] = useState<
    Record<string, string | undefined>
  >(initialState.filters || {})
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

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setPageState(1)
  }, [])

  const setPage = useCallback((value: number) => {
    setPageState(value)
  }, [])

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
    setPageState(1)
  }, [])

  const handleSort = useCallback(
    (key: TSortKey) => {
      if (key === sortKey) {
        setSortOrderState((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKeyState(key)
        setSortOrderState('asc')
      }
      setPageState(1)
    },
    [sortKey],
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

  useEffect(() => {
    if (!routePath) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const params: Record<string, string | number | undefined> = {}
    if (search) params.q = search
    if (page > 1) params.page = page
    if (sortKey !== defaultSortKey) params.sort = sortKey
    if (sortOrder !== 'desc') params.order = sortOrder

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params[key] = value
      }
    })

    navigate({
      to: routePath,
      search: params,
      replace: true,
    })
  }, [
    search,
    page,
    sortKey,
    sortOrder,
    filters,
    routePath,
    defaultSortKey,
    navigate,
  ])

  return {
    items,
    total,
    totalPages,
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
