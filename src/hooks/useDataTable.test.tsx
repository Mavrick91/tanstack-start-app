import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDataTable } from './useDataTable'
import { act, renderHook, waitFor } from '../test/test-utils'

interface TestItem {
  id: string
  name: string
}

const mockQueryFn = vi.fn()

describe('useDataTable', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })
    mockQueryFn.mockResolvedValue({
      data: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ],
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const renderDataTable = (overrides = {}) => {
    return renderHook(
      () =>
        useDataTable<TestItem>({
          id: 'test-table',
          queryFn: mockQueryFn,
          defaultSortKey: 'name',
          ...overrides,
        }),
      { wrapper },
    )
  }

  describe('Initial state', () => {
    it('starts with loading state', () => {
      const { result } = renderDataTable()
      expect(result.current.isLoading).toBe(true)
    })

    it('uses default values', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.search).toBe('')
      expect(result.current.page).toBe(1)
      expect(result.current.limit).toBe(10)
      expect(result.current.sortKey).toBe('name')
      expect(result.current.sortOrder).toBe('desc')
    })

    it('respects initial state overrides', async () => {
      const { result } = renderDataTable({
        initialState: {
          search: 'test',
          page: 2,
          sortKey: 'date',
          sortOrder: 'asc',
        },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.search).toBe('test')
      expect(result.current.page).toBe(2)
      expect(result.current.sortKey).toBe('date')
      expect(result.current.sortOrder).toBe('asc')
    })
  })

  describe('Data loading', () => {
    it('calls queryFn with table state', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockQueryFn).toHaveBeenCalledWith({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'name',
        sortOrder: 'desc',
        filters: {},
      })
    })

    it('returns items from query', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      expect(result.current.items[0].name).toBe('Item 1')
      expect(result.current.total).toBe(3)
      expect(result.current.totalPages).toBe(1)
    })
  })

  describe('Search', () => {
    it('updates search value', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSearch('new search')
      })

      expect(result.current.search).toBe('new search')
    })

    it('resets page to 1 when searching', async () => {
      const { result } = renderDataTable({
        initialState: { page: 3 },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.page).toBe(3)

      act(() => {
        result.current.setSearch('new search')
      })

      expect(result.current.page).toBe(1)
    })
  })

  describe('Pagination', () => {
    it('updates page value', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(5)
      })

      expect(result.current.page).toBe(5)
    })
  })

  describe('Sorting', () => {
    it('toggles sort order when clicking same key', async () => {
      const { result } = renderDataTable({
        initialState: { sortKey: 'name', sortOrder: 'asc' },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.sortOrder).toBe('asc')

      act(() => {
        result.current.handleSort('name')
      })

      expect(result.current.sortOrder).toBe('desc')
    })

    it('changes sort key and resets to asc when clicking different key', async () => {
      const { result } = renderDataTable({
        initialState: { sortKey: 'name', sortOrder: 'desc' },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleSort('date')
      })

      expect(result.current.sortKey).toBe('date')
      expect(result.current.sortOrder).toBe('asc')
    })

    it('resets page to 1 when sorting', async () => {
      const { result } = renderDataTable({
        initialState: { page: 3 },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleSort('date')
      })

      expect(result.current.page).toBe(1)
    })
  })

  describe('Filters', () => {
    it('sets filter value', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setFilter('status', 'active')
      })

      expect(result.current.filters.status).toBe('active')
    })

    it('resets page to 1 when filtering', async () => {
      const { result } = renderDataTable({
        initialState: { page: 3 },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setFilter('status', 'active')
      })

      expect(result.current.page).toBe(1)
    })

    it('clears filter when setting undefined', async () => {
      const { result } = renderDataTable({
        initialState: { filters: { status: 'active' } },
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setFilter('status', undefined)
      })

      expect(result.current.filters.status).toBeUndefined()
    })
  })

  describe('Row selection', () => {
    it('starts with empty selection', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.selectedCount).toBe(0)
    })

    it('toggleSelect adds item to selection', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })

    it('toggleSelect removes item from selection', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelect('1')
      })

      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('toggleSelectAll selects all items', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected).toBe(true)
    })

    it('toggleSelectAll deselects when all selected', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('clearSelection removes all selections', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedCount).toBe(0)
    })

    it('isSomeSelected is true when partial selection', async () => {
      const { result } = renderDataTable()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.isSomeSelected).toBe(true)
      expect(result.current.isAllSelected).toBe(false)
    })
  })
})
