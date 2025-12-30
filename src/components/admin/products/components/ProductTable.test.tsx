import { describe, expect, it, vi } from 'vitest'

import { ProductTable, ProductTableSkeleton } from './ProductTable'

import type { Product } from '../types'

import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    params,
  }: {
    to: string
    children: React.ReactNode
    params?: Record<string, string>
  }) => (
    <a href={to.replace('$productId', params?.productId || '')}>{children}</a>
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

vi.mock('../../../../server/products', () => ({
  deleteProductFn: vi.fn(),
  duplicateProductFn: vi.fn(),
  updateProductStatusFn: vi.fn(),
}))

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    handle: 'test-product-1',
    name: { en: 'Test Product 1', fr: 'Produit Test 1' },
    status: 'active',
    price: '29.99',
    compareAtPrice: '39.99',
    sku: 'SKU-001',
    vendor: 'TestVendor',
    firstImageUrl: 'https://example.com/image1.jpg',
    productType: 'nail-polish',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    handle: 'test-product-2',
    name: { en: 'Test Product 2' },
    status: 'draft',
    price: '19.99',
    compareAtPrice: null,
    sku: null,
    vendor: null,
    firstImageUrl: null,
    productType: 'gel',
    createdAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'prod-3',
    handle: 'test-product-3',
    name: { en: 'Out of Stock Item' },
    status: 'archived',
    price: null,
    compareAtPrice: null,
    sku: 'SKU-003',
    vendor: 'AnotherVendor',
    firstImageUrl: 'https://example.com/image3.jpg',
    productType: 'accessories',
    createdAt: '2024-01-03T00:00:00.000Z',
  },
]

describe('ProductTable', () => {
  const mockOnToggleSelect = vi.fn()
  const mockOnToggleSelectAll = vi.fn()
  const mockOnSort = vi.fn()

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ProductTable>> = {},
  ) => {
    const defaultProps = {
      products: mockProducts,
      selectedIds: new Set<string>(),
      onToggleSelect: mockOnToggleSelect,
      onToggleSelectAll: mockOnToggleSelectAll,
      isAllSelected: false,
      isSomeSelected: false,
      sortKey: 'name' as const,
      sortOrder: 'asc' as const,
      onSort: mockOnSort,
    }
    return render(<ProductTable {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders all products', () => {
      renderComponent()
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
      expect(screen.getByText('Out of Stock Item')).toBeInTheDocument()
    })

    it('renders table headers', () => {
      renderComponent()
      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('SKU')).toBeInTheDocument()
    })

    it('renders product images when available', () => {
      renderComponent()
      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2) // prod-1 and prod-3 have images
    })

    it('renders placeholder when no image', () => {
      renderComponent()
      // Product 2 has no image, should show first letter
      expect(screen.getByText('T')).toBeInTheDocument() // First letter of "Test Product 2"
    })

    it('renders product handles', () => {
      renderComponent()
      expect(screen.getByText(/test-product-1/)).toBeInTheDocument()
      expect(screen.getByText(/test-product-2/)).toBeInTheDocument()
    })

    it('renders vendor or default', () => {
      renderComponent()
      expect(screen.getByText(/TestVendor/)).toBeInTheDocument()
      expect(screen.getByText(/FineNail/)).toBeInTheDocument() // Default for null vendor
    })
  })

  describe('Status badges', () => {
    it('renders active status badge', () => {
      renderComponent()
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('renders draft status badge', () => {
      renderComponent()
      expect(screen.getByText('draft')).toBeInTheDocument()
    })

    it('renders archived status badge', () => {
      renderComponent()
      expect(screen.getByText('archived')).toBeInTheDocument()
    })
  })

  describe('Price display', () => {
    it('renders price with dollar sign', () => {
      renderComponent()
      expect(screen.getByText('$29.99')).toBeInTheDocument()
      expect(screen.getByText('$19.99')).toBeInTheDocument()
    })

    it('renders compare at price with strikethrough', () => {
      renderComponent()
      const strikethroughPrice = screen.getByText('$39.99')
      expect(strikethroughPrice).toHaveClass('line-through')
    })

    it('renders dash for null price', () => {
      renderComponent()
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('SKU display', () => {
    it('renders SKU when available', () => {
      renderComponent()
      expect(screen.getByText('SKU-001')).toBeInTheDocument()
      expect(screen.getByText('SKU-003')).toBeInTheDocument()
    })

    it('renders dash for null SKU', () => {
      renderComponent()
      // Product 2 has null SKU
      const skuCells = screen.getAllByText('—')
      expect(skuCells.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Selection', () => {
    it('renders checkbox for each product', () => {
      renderComponent()
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(4) // 1 header + 3 products
    })

    it('calls onToggleSelect when clicking product checkbox', async () => {
      const { user } = renderComponent()

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // First product checkbox

      expect(mockOnToggleSelect).toHaveBeenCalledWith('prod-1')
    })

    it('calls onToggleSelectAll when clicking header checkbox', async () => {
      const { user } = renderComponent()

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0]) // Header checkbox

      expect(mockOnToggleSelectAll).toHaveBeenCalled()
    })

    it('checks selected products', () => {
      renderComponent({ selectedIds: new Set(['prod-1', 'prod-3']) })
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      expect(checkboxes[1].checked).toBe(true) // prod-1
      expect(checkboxes[2].checked).toBe(false) // prod-2
      expect(checkboxes[3].checked).toBe(true) // prod-3
    })

    it('checks header checkbox when all selected', () => {
      renderComponent({ isAllSelected: true })
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      expect(checkboxes[0].checked).toBe(true)
    })

    it('highlights selected rows', () => {
      const { container } = renderComponent({
        selectedIds: new Set(['prod-1']),
      })
      const rows = container.querySelectorAll('tbody tr')
      expect(rows[0]).toHaveClass('bg-pink-500/5')
      expect(rows[1]).not.toHaveClass('bg-pink-500/5')
    })
  })

  describe('Sorting', () => {
    it('renders sortable headers', () => {
      renderComponent()
      const sortButtons = screen.getAllByRole('button')
      expect(sortButtons.length).toBeGreaterThanOrEqual(3) // Product, Status, Price
    })

    it('calls onSort when clicking sortable header', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Status'))

      expect(mockOnSort).toHaveBeenCalledWith('status')
    })

    it('calls onSort with price key', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByText('Price'))

      expect(mockOnSort).toHaveBeenCalledWith('price')
    })
  })

  describe('Links', () => {
    it('links to product edit page', () => {
      renderComponent()
      const link = screen.getByRole('link', { name: /Test Product 1/i })
      expect(link).toHaveAttribute('href', '/admin/products/prod-1')
    })
  })
})

describe('ProductTableSkeleton', () => {
  it('renders skeleton rows', () => {
    const { container } = render(<ProductTableSkeleton />)
    const skeletonRows = container.querySelectorAll('tbody tr')
    expect(skeletonRows).toHaveLength(5)
  })

  it('has animate-pulse class', () => {
    const { container } = render(<ProductTableSkeleton />)
    const animatedRows = container.querySelectorAll('.animate-pulse')
    expect(animatedRows.length).toBeGreaterThan(0)
  })

  it('renders header columns', () => {
    render(<ProductTableSkeleton />)
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('SKU')).toBeInTheDocument()
  })
})
