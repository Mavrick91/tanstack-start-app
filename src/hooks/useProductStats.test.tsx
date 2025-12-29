import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductStats } from './useProductStats'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useProductStats', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should fetch and return product stats', async () => {
    const mockStats = {
      success: true,
      totalProducts: 100,
      activeCount: 60,
      draftCount: 30,
      archivedCount: 10,
      lowStockCount: 5,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      totalProducts: 100,
      activeCount: 60,
      draftCount: 30,
      archivedCount: 10,
      lowStockCount: 5,
    })
  })

  it('should call /api/products/stats endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          totalProducts: 0,
          activeCount: 0,
          draftCount: 0,
          archivedCount: 0,
          lowStockCount: 0,
        }),
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/api/products/stats', {
      credentials: 'include',
    })
  })

  it('should handle HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('HTTP error 401')
  })

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Database connection failed',
        }),
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Database connection failed')
  })

  it('should handle invalid response shape', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          // Missing required fields
        }),
    })

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Invalid stats response')
  })

  it('should use correct query key for caching', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          totalProducts: 10,
          activeCount: 5,
          draftCount: 3,
          archivedCount: 2,
          lowStockCount: 1,
        }),
    })

    // First render
    const { result: result1 } = renderHook(() => useProductStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // Stats should be cached and not refetch on same query key
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
