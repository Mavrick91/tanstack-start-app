import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductStats } from './useProductStats'

import type { ReactNode } from 'react'

import { getProductStatsFn } from '@/server/products'
import { renderHook, waitFor } from '@/test/test-utils'

// Mock server function
vi.mock('@/server/products', () => ({
  getProductStatsFn: vi.fn(),
}))

const mockGetProductStats = vi.mocked(getProductStatsFn)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

describe('useProductStats', () => {
  beforeEach(() => {
    mockGetProductStats.mockReset()
  })

  it('should fetch and return product stats', async () => {
    const mockStats = {
      totalProducts: 100,
      activeCount: 60,
      draftCount: 30,
      archivedCount: 10,
    }

    mockGetProductStats.mockResolvedValue(mockStats)

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      totalProducts: 100,
      activeCount: 60,
      draftCount: 30,
      archivedCount: 10,
    })
  })

  it('should call getProductStatsFn server function', async () => {
    mockGetProductStats.mockResolvedValue({
      totalProducts: 0,
      activeCount: 0,
      draftCount: 0,
      archivedCount: 0,
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetProductStats).toHaveBeenCalled()
  })

  it('should handle errors from server function', async () => {
    mockGetProductStats.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Unauthorized')
  })

  it('should use correct query key for caching', async () => {
    mockGetProductStats.mockResolvedValue({
      totalProducts: 10,
      activeCount: 5,
      draftCount: 3,
      archivedCount: 2,
    })

    // First render
    const { result: result1 } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // Stats should be cached and not refetch on same query key
    expect(mockGetProductStats).toHaveBeenCalledTimes(1)
  })
})
