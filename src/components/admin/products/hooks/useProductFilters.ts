import { useCallback, useMemo, useState } from 'react'

import type { Product, ProductStatus } from '../types'

export type SortKey = 'name' | 'price' | 'inventory' | 'status' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

interface UseProductFiltersOptions {
  initialSearch?: string
  initialStatus?: ProductStatus | 'all'
  initialSort?: SortKey
  initialOrder?: SortOrder
  initialPage?: number
}

/**
 * Hook for managing filter/sort/pagination STATE only.
 * The actual filtering is now done server-side.
 * This hook manages UI state and selection, not data transformation.
 */
export function useProductFilters(
  products: Product[],
  options: UseProductFiltersOptions = {},
) {
  const [search, setSearchState] = useState(options.initialSearch || '')
  const [statusFilter, setStatusFilterState] = useState<ProductStatus | 'all'>(
    options.initialStatus || 'all',
  )
  const [currentPage, setCurrentPageState] = useState(options.initialPage || 1)
  const [sortKey, setSortKeyState] = useState<SortKey>(
    options.initialSort || 'createdAt',
  )
  const [sortOrder, setSortOrderState] = useState<SortOrder>(
    options.initialOrder || 'desc',
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Handlers that reset page
  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setCurrentPageState(1)
  }, [])

  const setStatusFilter = useCallback((value: ProductStatus | 'all') => {
    setStatusFilterState(value)
    setCurrentPageState(1)
  }, [])

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page)
  }, [])

  // Sort handler - toggle order if same key
  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortOrderState((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKeyState(key)
        setSortOrderState('asc')
      }
      setCurrentPageState(1)
    },
    [sortKey],
  )

  // Selection handlers (operate on current page products)
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = products.map((p) => p.id)
    const allSelected = currentPageIds.every((id) => selectedIds.has(id))

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentPageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentPageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [products, selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useMemo(() => {
    if (products.length === 0) return false
    return products.every((p) => selectedIds.has(p.id))
  }, [products, selectedIds])

  const isSomeSelected = useMemo(() => {
    return products.some((p) => selectedIds.has(p.id))
  }, [products, selectedIds])

  return {
    // Filter state (for URL sync and API calls)
    search,
    setSearch,
    statusFilter,
    setStatusFilter,

    // Sort state
    sortKey,
    sortOrder,
    handleSort,

    // Pagination state
    currentPage,
    setCurrentPage,

    // Selection
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    selectedCount: selectedIds.size,
  }
}
