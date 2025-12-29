import { z } from 'zod'

import type { Product } from '../../components/admin/products/types'

// Zod schema for validating API response
// Using passthrough() to allow extra fields from the database
const productSchema = z
  .object({
    id: z.string(),
    handle: z.string(),
    name: z.object({
      en: z.string(),
      fr: z.string().optional(),
      id: z.string().optional(),
    }),
    status: z.enum(['draft', 'active', 'archived']),
    vendor: z.string().nullable(),
    productType: z.string().nullable(),
    price: z.string().nullable(),
    // These fields may not be present if the variant doesn't have them
    compareAtPrice: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    inventoryQuantity: z.number(),
    // Accept both string and Date for timestamps (database returns Date objects)
    createdAt: z.union([z.string(), z.date()]),
    firstImageUrl: z.string().nullable(),
  })
  .passthrough()

export const productsResponseSchema = z.object({
  success: z.literal(true),
  products: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export type ProductsResponse = z.infer<typeof productsResponseSchema>

export interface FetchProductsState {
  search: string
  page: number
  limit: number
  sortKey: string
  sortOrder: string
  filters: Record<string, string | undefined>
}

export interface FetchProductsResult {
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function fetchProducts(
  state: FetchProductsState,
): Promise<FetchProductsResult> {
  const params = new URLSearchParams()
  params.set('page', String(state.page))
  params.set('limit', String(state.limit))
  if (state.search) params.set('q', state.search)
  if (state.filters.status && state.filters.status !== 'all') {
    params.set('status', state.filters.status)
  }
  if (state.sortKey) params.set('sort', state.sortKey)
  if (state.sortOrder) params.set('order', state.sortOrder)

  const res = await fetch(`/api/products?${params.toString()}`, {
    credentials: 'include',
  })

  // Check HTTP response status first
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`)
  }

  const json = await res.json()

  // Check for API-level errors
  if (!json.success) {
    throw new Error(json.error || 'Unknown API error')
  }

  // Validate response shape with zod
  const parsed = productsResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Invalid API response: ${parsed.error.message}`)
  }

  return {
    data: parsed.data.products as Product[],
    total: parsed.data.total,
    page: parsed.data.page,
    limit: parsed.data.limit,
    totalPages: parsed.data.totalPages,
  }
}
