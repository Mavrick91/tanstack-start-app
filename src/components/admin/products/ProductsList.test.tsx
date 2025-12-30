import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductsListContent } from './ProductsList'

import { getAdminProductsFn } from '@/server/products'
import { render, screen, waitFor } from '@/test/test-utils'

// Mock server function
vi.mock('@/server/products', () => ({
  getAdminProductsFn: vi.fn(),
}))

const mockGetAdminProducts = vi.mocked(getAdminProductsFn)

type MockProduct = Awaited<ReturnType<typeof getAdminProductsFn>>[number]

// Helper to create complete mock products
const createMockProduct = (overrides: Partial<MockProduct> = {}): MockProduct =>
  ({
    id: '1',
    handle: 'test-product',
    name: { en: 'Test Product' },
    description: null,
    status: 'active' as const,
    vendor: null,
    productType: null,
    tags: [],
    metaTitle: null,
    metaDescription: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    imageUrl: undefined,
    variantCount: 1,
    minPrice: 10,
    maxPrice: 10,
    totalInventory: 0,
    price: '10.00',
    ...overrides,
  }) as MockProduct

describe('Products List Page', () => {
  beforeEach(() => {
    mockGetAdminProducts.mockReset()
  })

  it('should show loading state initially', () => {
    mockGetAdminProducts.mockImplementation(() => new Promise(() => {}))
    render(<ProductsListContent />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should show empty state when no products', async () => {
    mockGetAdminProducts.mockResolvedValue([])

    render(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('No products yet')).toBeInTheDocument()
    })
  })

  it('should display products in table', async () => {
    const mockProducts = [
      createMockProduct({
        id: '1',
        handle: 'red-polish',
        name: { en: 'Red Polish', fr: 'Vernis Rouge' },
        status: 'active' as const,
        vendor: 'Finenail',
        productType: 'Nail Polish',
        variantCount: 2,
        minPrice: 12.99,
        maxPrice: 15.99,
        totalInventory: 100,
      }),
      createMockProduct({
        id: '2',
        handle: 'blue-gel',
        name: { en: 'Blue Gel' },
        status: 'draft' as const,
        variantCount: 1,
        minPrice: 19.99,
        maxPrice: 19.99,
        totalInventory: 0,
      }),
    ]

    mockGetAdminProducts.mockResolvedValue(mockProducts)

    render(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('Red Polish')).toBeInTheDocument()
      expect(screen.getByText('Blue Gel')).toBeInTheDocument()
    })

    // Check status badges
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()

    // Check inventory
    expect(screen.getByText('100 in stock')).toBeInTheDocument()
    expect(screen.getByText('0 in stock')).toBeInTheDocument()

    // Check variant counts
    expect(screen.getByText('2 variants')).toBeInTheDocument()
    expect(screen.getByText('1 variant')).toBeInTheDocument()
  })

  it('should show error state on fetch failure', async () => {
    mockGetAdminProducts.mockRejectedValue(new Error('Server error'))

    render(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument()
    })
  })

  it('should have Add Product button linking to new page', async () => {
    mockGetAdminProducts.mockResolvedValue([])

    render(<ProductsListContent />)

    await waitFor(() => {
      // There are multiple "Add Product" buttons on empty state - check they all link correctly
      const addLinks = screen.getAllByRole('link')
      const productLinks = addLinks.filter(
        (link) => link.getAttribute('href') === '/admin/products/new',
      )
      expect(productLinks.length).toBeGreaterThan(0)
    })
  })

  it('should display price ranges correctly', async () => {
    const mockProducts = [
      createMockProduct({
        id: '1',
        handle: 'range-product',
        name: { en: 'Range Product' },
        variantCount: 2,
        minPrice: 10.0,
        maxPrice: 20.0,
        totalInventory: 50,
      }),
    ]

    mockGetAdminProducts.mockResolvedValue(mockProducts)

    render(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('$10.00 - $20.00')).toBeInTheDocument()
    })
  })

  it('should show vendor when available', async () => {
    const mockProducts = [
      createMockProduct({
        id: '1',
        handle: 'vendor-product',
        name: { en: 'Vendor Product' },
        vendor: 'TestVendor',
        minPrice: 15.0,
        maxPrice: 15.0,
        totalInventory: 10,
      }),
    ]

    mockGetAdminProducts.mockResolvedValue(mockProducts)

    render(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('TestVendor')).toBeInTheDocument()
    })
  })
})
