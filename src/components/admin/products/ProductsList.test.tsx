import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductsListContent } from './ProductsList'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Products List Page', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    mockFetch.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    )
  }

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<ProductsListContent />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should show empty state when no products', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, products: [] }),
    })

    renderWithProviders(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('No products yet')).toBeInTheDocument()
    })
  })

  it('should display products in table', async () => {
    const mockProducts = [
      {
        id: '1',
        handle: 'red-polish',
        name: { en: 'Red Polish', fr: 'Vernis Rouge' },
        status: 'active',
        vendor: 'Finenail',
        productType: 'Nail Polish',
        variantCount: 2,
        minPrice: 12.99,
        maxPrice: 15.99,
        totalInventory: 100,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        handle: 'blue-gel',
        name: { en: 'Blue Gel' },
        status: 'draft',
        vendor: null,
        productType: null,
        variantCount: 1,
        minPrice: 19.99,
        maxPrice: 19.99,
        totalInventory: 0,
        createdAt: '2024-01-02T00:00:00Z',
      },
    ]

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, products: mockProducts }),
    })

    renderWithProviders(<ProductsListContent />)

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
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Server error' }),
    })

    renderWithProviders(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument()
    })
  })

  it('should have Add Product button linking to new page', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, products: [] }),
    })

    renderWithProviders(<ProductsListContent />)

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
      {
        id: '1',
        handle: 'range-product',
        name: { en: 'Range Product' },
        status: 'active',
        vendor: null,
        productType: null,
        variantCount: 2,
        minPrice: 10.0,
        maxPrice: 20.0,
        totalInventory: 50,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, products: mockProducts }),
    })

    renderWithProviders(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('$10.00 - $20.00')).toBeInTheDocument()
    })
  })

  it('should show vendor when available', async () => {
    const mockProducts = [
      {
        id: '1',
        handle: 'vendor-product',
        name: { en: 'Vendor Product' },
        status: 'active',
        vendor: 'TestVendor',
        productType: null,
        variantCount: 1,
        minPrice: 15.0,
        maxPrice: 15.0,
        totalInventory: 10,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, products: mockProducts }),
    })

    renderWithProviders(<ProductsListContent />)

    await waitFor(() => {
      expect(screen.getByText('TestVendor')).toBeInTheDocument()
    })
  })
})
