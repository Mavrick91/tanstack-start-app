import { describe, expect, it } from 'vitest'

import { useProductFilters } from './useProductFilters'

import type { Product } from '../types'

import { act, renderHook } from '@/test/test-utils'

describe('useProductFilters', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      handle: 'product-1',
      name: { en: 'Product 1' },
      price: '100',
      compareAtPrice: null,
      sku: 'SKU-001',
      status: 'active' as const,
      vendor: 'Test Vendor',
      productType: 'Test Type',
      firstImageUrl: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      handle: 'product-2',
      name: { en: 'Product 2' },
      price: '200',
      compareAtPrice: null,
      sku: 'SKU-002',
      status: 'draft' as const,
      vendor: 'Test Vendor',
      productType: 'Test Type',
      firstImageUrl: null,
      createdAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      handle: 'product-3',
      name: { en: 'Product 3' },
      price: '300',
      compareAtPrice: null,
      sku: 'SKU-003',
      status: 'archived' as const,
      vendor: 'Test Vendor',
      productType: 'Test Type',
      firstImageUrl: null,
      createdAt: '2024-01-03T00:00:00.000Z',
    },
  ]

  describe('Initial state', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      expect(result.current.search).toBe('')
      expect(result.current.statusFilter).toBe('all')
      expect(result.current.currentPage).toBe(1)
      expect(result.current.sortKey).toBe('createdAt')
      expect(result.current.sortOrder).toBe('desc')
      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.selectedCount).toBe(0)
    })

    it('accepts initial values from options', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, {
          initialSearch: 'test search',
          initialStatus: 'active',
          initialSort: 'price',
          initialOrder: 'asc',
          initialPage: 3,
        }),
      )

      expect(result.current.search).toBe('test search')
      expect(result.current.statusFilter).toBe('active')
      expect(result.current.currentPage).toBe(3)
      expect(result.current.sortKey).toBe('price')
      expect(result.current.sortOrder).toBe('asc')
    })
  })

  describe('Search functionality', () => {
    it('updates search value', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.setSearch('new search')
      })

      expect(result.current.search).toBe('new search')
    })

    it('resets page to 1 when search changes', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, { initialPage: 5 }),
      )

      act(() => {
        result.current.setSearch('test')
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('handles empty search string', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, { initialSearch: 'initial' }),
      )

      act(() => {
        result.current.setSearch('')
      })

      expect(result.current.search).toBe('')
      expect(result.current.currentPage).toBe(1)
    })
  })

  describe('Status filter functionality', () => {
    it('updates status filter', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.setStatusFilter('active')
      })

      expect(result.current.statusFilter).toBe('active')
    })

    it('resets page to 1 when status filter changes', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, { initialPage: 3 }),
      )

      act(() => {
        result.current.setStatusFilter('draft')
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('accepts "all" as valid status', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.setStatusFilter('all')
      })

      expect(result.current.statusFilter).toBe('all')
    })
  })

  describe('Pagination functionality', () => {
    it('updates current page', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.setCurrentPage(5)
      })

      expect(result.current.currentPage).toBe(5)
    })

    it('allows setting page to 1', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, { initialPage: 10 }),
      )

      act(() => {
        result.current.setCurrentPage(1)
      })

      expect(result.current.currentPage).toBe(1)
    })
  })

  describe('Sort functionality', () => {
    it('changes sort key and sets order to asc', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.handleSort('price')
      })

      expect(result.current.sortKey).toBe('price')
      expect(result.current.sortOrder).toBe('asc')
    })

    it('toggles sort order when same key is clicked', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, {
          initialSort: 'price',
          initialOrder: 'asc',
        }),
      )

      act(() => {
        result.current.handleSort('price')
      })

      expect(result.current.sortKey).toBe('price')
      expect(result.current.sortOrder).toBe('desc')

      // Toggle again
      act(() => {
        result.current.handleSort('price')
      })

      expect(result.current.sortOrder).toBe('asc')
    })

    it('resets page to 1 when sort changes', () => {
      const { result } = renderHook(() =>
        useProductFilters(mockProducts, { initialPage: 7 }),
      )

      act(() => {
        result.current.handleSort('name')
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('supports all sort keys', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      const sortKeys = [
        'name',
        'price',
        'inventory',
        'status',
        'createdAt',
      ] as const

      sortKeys.forEach((key) => {
        act(() => {
          result.current.handleSort(key)
        })
        expect(result.current.sortKey).toBe(key)
      })
    })
  })

  describe('Selection functionality', () => {
    it('toggles single product selection', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)

      // Toggle off
      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('allows selecting multiple products', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.toggleSelect('1')
        result.current.toggleSelect('2')
        result.current.toggleSelect('3')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectedIds.has('3')).toBe(true)
      expect(result.current.selectedCount).toBe(3)
    })

    it('selects all products on current page', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectedIds.has('3')).toBe(true)
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected).toBe(true)
    })

    it('deselects all products when all are selected', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      // Select all first
      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.isAllSelected).toBe(true)

      // Toggle again to deselect
      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('handles toggleSelectAll with empty products array', () => {
      const { result } = renderHook(() => useProductFilters([]))

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('clears all selections', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      // Select some products
      act(() => {
        result.current.toggleSelect('1')
        result.current.toggleSelect('2')
      })

      expect(result.current.selectedCount).toBe(2)

      // Clear all
      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.selectedIds.size).toBe(0)
    })

    it('correctly calculates isAllSelected', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      expect(result.current.isAllSelected).toBe(false)

      // Select all
      act(() => {
        result.current.toggleSelect('1')
        result.current.toggleSelect('2')
        result.current.toggleSelect('3')
      })

      expect(result.current.isAllSelected).toBe(true)

      // Deselect one
      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.isAllSelected).toBe(false)
    })

    it('correctly calculates isSomeSelected', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      expect(result.current.isSomeSelected).toBe(false)

      // Select one
      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.isSomeSelected).toBe(true)

      // Select all (isSomeSelected should still be true)
      act(() => {
        result.current.toggleSelect('2')
        result.current.toggleSelect('3')
      })

      expect(result.current.isSomeSelected).toBe(true)
    })

    it('returns false for isAllSelected when products array is empty', () => {
      const { result } = renderHook(() => useProductFilters([]))

      expect(result.current.isAllSelected).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('handles product list changes', () => {
      const { result, rerender } = renderHook(
        ({ products }) => useProductFilters(products),
        { initialProps: { products: mockProducts } },
      )

      // Select some products
      act(() => {
        result.current.toggleSelect('1')
      })

      expect(result.current.selectedCount).toBe(1)

      // Change product list
      const newProducts = mockProducts.slice(0, 2)
      rerender({ products: newProducts })

      // Selection should persist
      expect(result.current.selectedIds.has('1')).toBe(true)
    })

    it('handles selecting IDs not in current products', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      // Select an ID that doesn't exist in products
      act(() => {
        result.current.toggleSelect('999')
      })

      expect(result.current.selectedIds.has('999')).toBe(true)
      expect(result.current.selectedCount).toBe(1)

      // But it shouldn't affect isAllSelected
      expect(result.current.isAllSelected).toBe(false)
    })

    it('maintains selection immutability', () => {
      const { result } = renderHook(() => useProductFilters(mockProducts))

      const firstIds = result.current.selectedIds

      act(() => {
        result.current.toggleSelect('1')
      })

      const secondIds = result.current.selectedIds

      // Should create new Set, not mutate original
      expect(firstIds).not.toBe(secondIds)
      expect(firstIds.size).toBe(0)
      expect(secondIds.size).toBe(1)
    })
  })

  describe('Callback stability', () => {
    it('maintains stable callback references', () => {
      const { result, rerender } = renderHook(() =>
        useProductFilters(mockProducts),
      )

      const initialCallbacks = {
        setSearch: result.current.setSearch,
        setStatusFilter: result.current.setStatusFilter,
        setCurrentPage: result.current.setCurrentPage,
        handleSort: result.current.handleSort,
        toggleSelect: result.current.toggleSelect,
        toggleSelectAll: result.current.toggleSelectAll,
        clearSelection: result.current.clearSelection,
      }

      rerender()

      // Callbacks should remain the same (useCallback optimization)
      expect(result.current.setSearch).toBe(initialCallbacks.setSearch)
      expect(result.current.setStatusFilter).toBe(
        initialCallbacks.setStatusFilter,
      )
      expect(result.current.setCurrentPage).toBe(
        initialCallbacks.setCurrentPage,
      )
      expect(result.current.toggleSelect).toBe(initialCallbacks.toggleSelect)
      expect(result.current.clearSelection).toBe(
        initialCallbacks.clearSelection,
      )
    })
  })
})
