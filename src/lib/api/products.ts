import { z } from 'zod'

import { getProductsListFn } from '../../server/products'

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
    // Accept both string and Date for timestamps (database returns Date objects)
    createdAt: z.union([z.string(), z.date()]),
    firstImageUrl: z.string().nullable(),
  })
  .passthrough()

export const productsResponseSchema = z.object({
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
  const result = await getProductsListFn({
    data: {
      page: state.page,
      limit: state.limit,
      search: state.search || undefined,
      status:
        state.filters.status && state.filters.status !== 'all'
          ? (state.filters.status as 'active' | 'draft' | 'archived')
          : undefined,
      sortKey: state.sortKey || undefined,
      sortOrder: (state.sortOrder as 'asc' | 'desc') || undefined,
    },
  })

  // Validate response shape with zod
  const parsed = productsResponseSchema.safeParse(result)
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
