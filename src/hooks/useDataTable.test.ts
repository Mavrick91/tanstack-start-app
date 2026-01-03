import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDataTable } from './useDataTable'

import type { TableResponse, TableState } from './useDataTable'

import {
  act,
  renderHook,
  waitFor,
  createTestQueryClient,
} from '@/test/test-utils'

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

// Mock data factory
const createMockItem = (id: string) => ({ id, name: `Item ${id}` })

describe('useDataTable', () => {
  const mockQueryFn =
    vi.fn<
      (
        state: TableState<string>,
      ) => Promise<TableResponse<{ id: string; name: string }>>
    >()

  const defaultOptions = {
    id: 'test-table',
    queryFn: mockQueryFn,
    defaultSortKey: 'createdAt',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    mockQueryFn.mockResolvedValue({
      data: [createMockItem('1'), createMockItem('2'), createMockItem('3')],
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  describe('Initialization', () => {
    it('should initialize with default state', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      expect(result.current.search).toBe('')
      expect(result.current.page).toBe(1)
      expect(result.current.limit).toBe(10)
      expect(result.current.sortKey).toBe('createdAt')
      expect(result.current.sortOrder).toBe('desc')
      expect(result.current.selectedCount).toBe(0)
    })

    it('should initialize with custom initial state', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: {
              search: 'test',
              page: 2,
              sortKey: 'name',
              sortOrder: 'asc',
            },
          }),
        { wrapper },
      )

      expect(result.current.search).toBe('test')
      expect(result.current.page).toBe(2)
      expect(result.current.sortKey).toBe('name')
      expect(result.current.sortOrder).toBe('asc')
    })

    it('should use custom default limit', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            defaultLimit: 25,
          }),
        { wrapper },
      )

      expect(result.current.limit).toBe(25)
    })
  })

  describe('Data Fetching', () => {
    it('should fetch data on mount', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      expect(result.current.total).toBe(3)
      expect(result.current.totalPages).toBe(1)
      expect(mockQueryFn).toHaveBeenCalled()
    })

    it('should pass table state to query function', async () => {
      const wrapper = createWrapper()
      renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: {
              search: 'query',
              page: 2,
              sortKey: 'name',
              sortOrder: 'asc',
            },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'query',
            page: 2,
            sortKey: 'name',
            sortOrder: 'asc',
          }),
        )
      })
    })

    it('should show loading state while fetching', async () => {
      mockQueryFn.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should handle empty results', async () => {
      mockQueryFn.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(0)
        expect(result.current.total).toBe(0)
      })

      // totalPages has a fallback of 1 in the hook implementation
      expect(result.current.totalPages).toBe(1)
    })

    it('should expose extra data from response', async () => {
      mockQueryFn.mockResolvedValue({
        data: [createMockItem('1')],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        extra: { customField: 'customValue' },
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.extra).toEqual({ customField: 'customValue' })
      })
    })
  })

  describe('Search', () => {
    it('should update search query', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.setSearch('new query')
      })

      expect(result.current.search).toBe('new query')
    })

    it('should reset page to 1 when searching', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: { page: 3 },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.page).toBe(3)
      })

      act(() => {
        result.current.setSearch('query')
      })

      expect(result.current.page).toBe(1)
    })

    it('should refetch data when search changes', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(1)
      })

      act(() => {
        result.current.setSearch('query')
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(2)
      })

      expect(mockQueryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'query',
        }),
      )
    })
  })

  describe('Pagination', () => {
    it('should change page', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.setPage(2)
      })

      expect(result.current.page).toBe(2)
    })

    it('should refetch data when page changes', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(1)
      })

      act(() => {
        result.current.setPage(2)
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(2)
      })

      expect(mockQueryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        }),
      )
    })
  })

  describe('Sorting', () => {
    it('should sort by new column in ascending order', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.handleSort('name')
      })

      expect(result.current.sortKey).toBe('name')
      expect(result.current.sortOrder).toBe('asc')
    })

    it('should toggle sort order on same column', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: { sortKey: 'name', sortOrder: 'asc' },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.sortKey).toBe('name')
      })

      act(() => {
        result.current.handleSort('name')
      })

      expect(result.current.sortOrder).toBe('desc')
    })

    it('should reset page to 1 when sorting', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: { page: 3 },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.page).toBe(3)
      })

      act(() => {
        result.current.handleSort('name')
      })

      expect(result.current.page).toBe(1)
    })

    it('should refetch data when sorting changes', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(1)
      })

      act(() => {
        result.current.handleSort('name')
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(2)
      })

      expect(mockQueryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortKey: 'name',
          sortOrder: 'asc',
        }),
      )
    })
  })

  describe('Filtering', () => {
    it('should set filter', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.setFilter('status', 'active')
      })

      expect(result.current.filters).toEqual({ status: 'active' })
    })

    it('should reset page to 1 when filtering', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: { page: 3 },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.page).toBe(3)
      })

      act(() => {
        result.current.setFilter('status', 'active')
      })

      expect(result.current.page).toBe(1)
    })

    it('should refetch data when filter changes', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(1)
      })

      act(() => {
        result.current.setFilter('status', 'active')
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(2)
      })

      expect(mockQueryFn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: { status: 'active' },
        }),
      )
    })

    it('should clear filter with undefined value', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useDataTable({
            ...defaultOptions,
            initialState: { filters: { status: 'active' } },
          }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.filters).toEqual({ status: 'active' })
      })

      act(() => {
        result.current.setFilter('status', undefined)
      })

      expect(result.current.filters.status).toBeUndefined()
    })
  })

  describe('Selection', () => {
    beforeEach(() => {
      mockQueryFn.mockResolvedValue({
        data: [createMockItem('1'), createMockItem('2'), createMockItem('3')],
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should start with no selection', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
      expect(result.current.isSomeSelected).toBe(false)
    })

    it('should toggle single item selection', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSomeSelected).toBe(true)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('should deselect selected item', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelect('1')
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should select all items', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected).toBe(true)
      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectedIds.has('3')).toBe(true)
    })

    it('should deselect all when all are selected', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelectAll() // Select all
      })

      await waitFor(() => {
        expect(result.current.isAllSelected).toBe(true)
      })

      act(() => {
        result.current.toggleSelectAll() // Deselect all
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('should clear selection', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelect('1')
        result.current.toggleSelect('2')
        result.current.clearSelection()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isSomeSelected).toBe(false)
    })

    it('should preserve selection across pages', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      act(() => {
        result.current.toggleSelect('1')
        result.current.setPage(2)
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })
  })

  describe('Refetch', () => {
    it('should provide refetch function', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDataTable(defaultOptions), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3)
      })

      expect(result.current.refetch).toBeInstanceOf(Function)

      act(() => {
        result.current.refetch()
      })

      await waitFor(() => {
        expect(mockQueryFn).toHaveBeenCalledTimes(2)
      })
    })
  })
})
