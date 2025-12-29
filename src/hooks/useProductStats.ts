import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// Stats schema for validation
const statsSchema = z.object({
  success: z.literal(true),
  totalProducts: z.number(),
  activeCount: z.number(),
  draftCount: z.number(),
  archivedCount: z.number(),
  lowStockCount: z.number(),
})

export interface ProductStats {
  totalProducts: number
  activeCount: number
  draftCount: number
  archivedCount: number
  lowStockCount: number
}

async function fetchProductStats(): Promise<ProductStats> {
  const res = await fetch('/api/products/stats', {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`)
  }

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch stats')
  }

  const parsed = statsSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Invalid stats response: ${parsed.error.message}`)
  }

  return {
    totalProducts: parsed.data.totalProducts,
    activeCount: parsed.data.activeCount,
    draftCount: parsed.data.draftCount,
    archivedCount: parsed.data.archivedCount,
    lowStockCount: parsed.data.lowStockCount,
  }
}

export function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: fetchProductStats,
    // Stats don't change often, so we can cache them longer
    staleTime: 30 * 1000, // 30 seconds
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  })
}
