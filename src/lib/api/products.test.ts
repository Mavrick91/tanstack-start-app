import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchProducts, productsResponseSchema } from './products'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchProducts', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should throw error when response is not ok (e.g., 401)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('HTTP error 401')
  })

  it('should throw error when response is 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('HTTP error 500')
  })

  it('should throw error when API returns success: false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Database error' }),
    })

    await expect(
      fetchProducts({
        search: '',
        page: 1,
        limit: 10,
        sortKey: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      }),
    ).rejects.toThrow('Database error')
  })

  it('should throw validation error when response shape is invalid', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          products: 'invalid', // should be array
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }),
    })

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
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
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
        }),
    })

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
      status: 'active',
      vendor: null,
      productType: null,
      price: '10.00',
      compareAtPrice: null,
      sku: null,
      createdAt: '2024-01-01T00:00:00Z',
      firstImageUrl: null,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          products: [mockProduct],
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        }),
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

  it('should build correct URL params for search', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          products: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }),
    })

    await fetchProducts({
      search: 'test query',
      page: 2,
      limit: 20,
      sortKey: 'name',
      sortOrder: 'asc',
      filters: { status: 'active' },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=test+query'),
      expect.any(Object),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      expect.any(Object),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sort=name'),
      expect.any(Object),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('order=asc'),
      expect.any(Object),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('status=active'),
      expect.any(Object),
    )
  })

  it('should accept products with extra fields from API (passthrough)', async () => {
    // The API returns the full product object from the database which has
    // additional fields like description, tags, metaTitle, etc.
    const mockProductWithExtraFields = {
      id: '1',
      handle: 'test-product',
      name: { en: 'Test Product' },
      status: 'active',
      vendor: null,
      productType: null,
      price: '10.00',
      compareAtPrice: null,
      sku: null,
      createdAt: '2024-01-01T00:00:00Z',
      firstImageUrl: null,
      // Extra fields from database that aren't in Product type
      description: { en: 'A test product description' },
      metaTitle: null,
      metaDescription: null,
      tags: ['test', 'sample'],
      publishedAt: null,
      updatedAt: '2024-01-01T00:00:00Z',
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          products: [mockProductWithExtraFields],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
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

  it('should not include status param when filter is "all"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          products: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }),
    })

    await fetchProducts({
      search: '',
      page: 1,
      limit: 10,
      sortKey: 'createdAt',
      sortOrder: 'desc',
      filters: { status: 'all' },
    })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).not.toContain('status=')
  })
})

describe('productsResponseSchema', () => {
  it('should validate correct response shape', () => {
    const validResponse = {
      success: true,
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
      success: true,
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
      success: true,
      products: 'not-an-array',
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should reject when success is false', () => {
    const invalidResponse = {
      success: false,
      products: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const invalidResponse = {
      success: true,
      products: [],
      // missing total, page, limit, totalPages
    }

    const result = productsResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('should accept products with extra fields (passthrough)', () => {
    const responseWithExtraFields = {
      success: true,
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
      success: true,
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
    // The API may not return compareAtPrice and sku if they don't exist on the variant
    const responseWithoutOptionalFields = {
      success: true,
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
    // The API might return Date objects instead of strings for timestamps
    const responseWithDates = {
      success: true,
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
