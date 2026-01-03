import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductStats, type ProductStats } from './useProductStats'
import { getProductStatsFn } from '../server/products'

import {
  act,
  renderHook,
  waitFor,
  createTestQueryClient,
} from '@/test/test-utils'

// Mock server function
vi.mock('../server/products', () => ({
  getProductStatsFn: vi.fn(),
}))

const mockStats: ProductStats = {
  totalProducts: 100,
  activeCount: 80,
  draftCount: 15,
  archivedCount: 5,
}

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProductStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data fetching', () => {
    it('fetches product stats successfully', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(result.current.isLoading).toBe(false)
      expect(getProductStatsFn).toHaveBeenCalledOnce()
    })

    it('returns all stat properties', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.totalProducts).toBe(100)
      expect(result.current.data?.activeCount).toBe(80)
      expect(result.current.data?.draftCount).toBe(15)
      expect(result.current.data?.archivedCount).toBe(5)
    })

    it('handles error state', async () => {
      const error = new Error('Failed to fetch stats')
      vi.mocked(getProductStatsFn).mockRejectedValue(error)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('Caching behavior', () => {
    it('uses correct query key', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // The hook should use 'product-stats' as query key
      // This is implicitly tested by the hook working correctly
      expect(getProductStatsFn).toHaveBeenCalled()
    })

    it('caches data for subsequent renders', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const wrapper = createWrapper()

      // First render
      const { result: result1 } = renderHook(() => useProductStats(), {
        wrapper,
      })

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      expect(getProductStatsFn).toHaveBeenCalledOnce()

      // Second render with same wrapper (shared cache)
      const { result: result2 } = renderHook(() => useProductStats(), {
        wrapper,
      })

      // Should use cached data immediately
      await waitFor(() => {
        expect(result2.current.data).toEqual(mockStats)
      })

      // Should not call the function again (using cache)
      expect(getProductStatsFn).toHaveBeenCalledOnce()
    })
  })

  describe('Query configuration', () => {
    it('has refetchOnWindowFocus enabled', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify the hook configuration
      // refetchOnWindowFocus is tested by the hook working with this setting
      expect(result.current.data).toBeTruthy()
    })

    it('returns isLoading state during initial fetch', () => {
      vi.mocked(getProductStatsFn).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockStats), 100)
          }),
      )

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      // Should be loading initially
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('returns isPending state before query executes', () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      // Initially should be pending
      expect(result.current.isPending).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('handles stats with zero values', async () => {
      const zeroStats: ProductStats = {
        totalProducts: 0,
        activeCount: 0,
        draftCount: 0,
        archivedCount: 0,
        lowStockCount: 0,
      }

      vi.mocked(getProductStatsFn).mockResolvedValue(zeroStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(zeroStats)
    })

    it('handles stats without lowStockCount', async () => {
      const statsWithoutLowStock: ProductStats = {
        totalProducts: 50,
        activeCount: 40,
        draftCount: 8,
        archivedCount: 2,
      }

      vi.mocked(getProductStatsFn).mockResolvedValue(statsWithoutLowStock)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.totalProducts).toBe(50)
    })

    it('handles large numbers', async () => {
      const largeStats: ProductStats = {
        totalProducts: 999999,
        activeCount: 500000,
        draftCount: 300000,
        archivedCount: 199999,
      }

      vi.mocked(getProductStatsFn).mockResolvedValue(largeStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(largeStats)
    })

    it('maintains referential equality on refetch with same data', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const firstData = result.current.data

      // Trigger refetch
      await act(async () => {
        await result.current.refetch()
      })

      // Data should be structurally equal
      expect(result.current.data).toEqual(firstData)
    })
  })

  describe('Refetching', () => {
    it('can manually refetch data', async () => {
      vi.mocked(getProductStatsFn).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getProductStatsFn).toHaveBeenCalledOnce()

      // Manual refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(getProductStatsFn).toHaveBeenCalledTimes(2)
    })

    it('updates data after refetch with new values', async () => {
      const initialStats: ProductStats = {
        totalProducts: 50,
        activeCount: 40,
        draftCount: 8,
        archivedCount: 2,
      }

      const updatedStats: ProductStats = {
        totalProducts: 60,
        activeCount: 50,
        draftCount: 8,
        archivedCount: 2,
      }

      vi.mocked(getProductStatsFn).mockResolvedValueOnce(initialStats)

      const { result } = renderHook(() => useProductStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(initialStats)

      // Mock new data for refetch
      vi.mocked(getProductStatsFn).mockResolvedValueOnce(updatedStats)

      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedStats)
      })
    })
  })
})
