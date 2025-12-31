import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchProducts, productsResponseSchema } from './products'
import { getProductsListFn } from '../../server/products'

// Mock the server function
vi.mock('../../server/products', () => ({
  getProductsListFn: vi.fn(),
}))

describe('fetchProducts', () => {
  beforeEach(() => {
    vi.mocked(getProductsListFn).mockReset()
  })

  it('should throw error when server function throws', async () => {
    vi.mocked(getProductsListFn).mockRejectedValue(new Error('Unauthorized'))

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('Unauthorized')
  })

  it('should throw validation error when response shape is invalid', async () => {
    vi.mocked(getProductsListFn).mockResolvedValue({
      products: 'invalid', // should be array
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    } as never)

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('Invalid API response')
  })

  it('should throw validation error when product has invalid status', async () => {
    vi.mocked(getProductsListFn).mockResolvedValue({
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'invalid_status', // invalid
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    } as never)

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('Invalid API response')
  })

  it('should return validated data on success', async () => {
    const mockProduct = {
      id: '1',
      handle: 'test-product',
      name: { en: 'Test Product' },
      status: 'active' as const,
      vendor: null,
      productType: null,
      price: '10.00',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      firstImageUrl: null,
      description: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      publishedAt: null,
    }

    vi.mocked(getProductsListFn).mockResolvedValue({
      products: [mockProduct],
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    })

    const result = await fetchProducts({
      search: '',
      page: 1,
      limit: 10,
      sortKey: 'createdAt',
      sortOrder: 'desc',
      filters: {},
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('1')
    expect(result.total).toBe(25)
    expect(result.totalPages).toBe(3)
  })

  it('should pass correct params to server function', async () => {
    vi.mocked(getProductsListFn).mockResolvedValue({
      products: [],
      total: 0,
      page: 2,
      limit: 20,
      totalPages: 0,
    })

    await fetchProducts({
      search: 'test query',
      page: 2,
      limit: 20,
      sortKey: 'name',
      sortOrder: 'asc',
      filters: { status: 'active' },
    })

    expect(getProductsListFn).toHaveBeenCalledWith({
      data: {
        page: 2,
        limit: 20,
        search: 'test query',
        status: 'active',
        sortKey: 'name',
        sortOrder: 'asc',
      },
    })
  })

  it('should accept products with extra fields from API (passthrough)', async () => {
    const mockProductWithExtraFields = {
      id: '1',
      handle: 'test-product',
      name: { en: 'Test Product' },
      status: 'active' as const,
      vendor: null,
      productType: null,
      price: '10.00',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      firstImageUrl: null,
      // Extra fields from database
      description: { en: 'A test product description' },
      metaTitle: null,
      metaDescription: null,
      tags: ['test', 'sample'],
      publishedAt: null,
    }

    vi.mocked(getProductsListFn).mockResolvedValue({
      products: [mockProductWithExtraFields],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    })

    const result = await fetchProducts({
      search: '',
      page: 1,
      limit: 10,
      sortKey: 'createdAt',
      sortOrder: 'desc',
      filters: {},
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('1')
    expect(result.data[0].handle).toBe('test-product')
  })

  it('should not include status when filter is "all"', async () => {
    vi.mocked(getProductsListFn).mockResolvedValue({
      products: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    })

    await fetchProducts({
      search: '',
      page: 1,
      limit: 10,
      sortKey: 'createdAt',
      sortOrder: 'desc',
      filters: { status: 'all' },
    })

    expect(getProductsListFn).toHaveBeenCalledWith({
      data: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        sortKey: 'createdAt',
        sortOrder: 'desc',
      },
    })
  })
})

describe('productsResponseSchema', () => {
  it('should validate correct response shape', () => {
    const validResponse = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'active',
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('should reject invalid product status', () => {
    const invalidResponse = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'invalid_status',
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should reject when products is not an array', () => {
    const invalidResponse = {
      products: 'not-an-array',
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const invalidResponse = {
      products: [],
      // missing total, page, limit, totalPages
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should accept products with extra fields (passthrough)', () => {
    const responseWithExtraFields = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'active',
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
          // Extra fields from database
          description: { en: 'Description' },
          metaTitle: null,
          metaDescription: null,
          tags: ['tag1'],
          publishedAt: null,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(responseWithExtraFields)
    expect(result.success).toBe(true)
  })

  it('should accept products with null description (common case)', () => {
    const responseWithNullDescription = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'active',
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
          // Null description (common when not set)
          description: null,
          metaTitle: null,
          metaDescription: null,
          tags: null,
          publishedAt: null,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(responseWithNullDescription)
    expect(result.success).toBe(true)
  })

  it('should accept products without compareAtPrice and sku fields (undefined)', () => {
    const responseWithoutOptionalFields = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'active',
          vendor: null,
          productType: null,
          price: '10.00',
          // compareAtPrice and sku are NOT present (undefined)
          createdAt: '2024-01-01T00:00:00Z',
          firstImageUrl: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(
      responseWithoutOptionalFields,
    )
    expect(result.success).toBe(true)
  })

  it('should accept products with Date objects for timestamps', () => {
    const responseWithDates = {
      products: [
        {
          id: '1',
          handle: 'test',
          name: { en: 'Test' },
          status: 'active',
          vendor: null,
          productType: null,
          price: '10.00',
          compareAtPrice: null,
          sku: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          firstImageUrl: null,
          description: null,
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(responseWithDates)
    expect(result.success).toBe(true)
  })
})
