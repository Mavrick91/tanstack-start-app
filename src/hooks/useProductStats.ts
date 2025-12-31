import { useQuery } from '@tanstack/react-query'

import { getProductStatsFn } from '../server/products'

export interface ProductStats {
  totalProducts: number
  activeCount: number
  draftCount: number
  archivedCount: number
  lowStockCount?: number
}

export const useProductStats = () => {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: () => getProductStatsFn(),
    // Stats don't change often, so we can cache them longer
    staleTime: 30 * 1000, // 30 seconds
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  })
}
