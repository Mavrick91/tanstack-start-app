import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProductStats } from './ProductStats'

import type { Product } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  handle: 'test-product',
  name: { en: 'Test Product' },
  status: 'active',
  price: '29.99',
  compareAtPrice: null,
  inventoryQuantity: 50,
  sku: 'SKU-001',
  vendor: 'TestVendor',
  firstImageUrl: null,
  productType: 'nail-polish',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('ProductStats', () => {
  describe('Rendering', () => {
    it('renders all four stat cards', () => {
      const products = [createMockProduct()]
      render(<ProductStats products={products} />)

      expect(screen.getByText('Total Products')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Drafts')).toBeInTheDocument()
      expect(screen.getByText('Low Stock')).toBeInTheDocument()
    })

    it('renders with empty products array', () => {
      render(<ProductStats products={[]} />)

      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(4) // All 4 stats show 0
    })
  })

  describe('Total Products', () => {
    it('shows correct total count', () => {
      const products = [
        createMockProduct({ id: '1' }),
        createMockProduct({ id: '2' }),
        createMockProduct({ id: '3' }),
      ]
      render(<ProductStats products={products} />)

      const totalCard = screen.getByText('Total Products').parentElement
      expect(totalCard).toHaveTextContent('3')
    })

    it('shows zero when no products', () => {
      render(<ProductStats products={[]} />)

      const totalCard = screen.getByText('Total Products').parentElement
      expect(totalCard).toHaveTextContent('0')
    })
  })

  describe('Active count', () => {
    it('counts only active products', () => {
      const products = [
        createMockProduct({ id: '1', status: 'active' }),
        createMockProduct({ id: '2', status: 'active' }),
        createMockProduct({ id: '3', status: 'draft' }),
        createMockProduct({ id: '4', status: 'archived' }),
      ]
      render(<ProductStats products={products} />)

      const activeCard = screen.getByText('Active').parentElement
      expect(activeCard).toHaveTextContent('2')
    })

    it('shows zero when no active products', () => {
      const products = [
        createMockProduct({ id: '1', status: 'draft' }),
        createMockProduct({ id: '2', status: 'archived' }),
      ]
      render(<ProductStats products={products} />)

      const activeCard = screen.getByText('Active').parentElement
      expect(activeCard).toHaveTextContent('0')
    })
  })

  describe('Draft count', () => {
    it('counts only draft products', () => {
      const products = [
        createMockProduct({ id: '1', status: 'active' }),
        createMockProduct({ id: '2', status: 'draft' }),
        createMockProduct({ id: '3', status: 'draft' }),
        createMockProduct({ id: '4', status: 'draft' }),
      ]
      render(<ProductStats products={products} />)

      const draftCard = screen.getByText('Drafts').parentElement
      expect(draftCard).toHaveTextContent('3')
    })

    it('shows zero when no draft products', () => {
      const products = [
        createMockProduct({ id: '1', status: 'active' }),
        createMockProduct({ id: '2', status: 'archived' }),
      ]
      render(<ProductStats products={products} />)

      const draftCard = screen.getByText('Drafts').parentElement
      expect(draftCard).toHaveTextContent('0')
    })
  })

  describe('Low Stock count', () => {
    it('counts products with inventory less than 5', () => {
      const products = [
        createMockProduct({ id: '1', inventoryQuantity: 0 }),
        createMockProduct({ id: '2', inventoryQuantity: 2 }),
        createMockProduct({ id: '3', inventoryQuantity: 4 }),
        createMockProduct({ id: '4', inventoryQuantity: 5 }),
        createMockProduct({ id: '5', inventoryQuantity: 50 }),
      ]
      render(<ProductStats products={products} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('3') // 0, 2, 4 are < 5
    })

    it('includes zero inventory as low stock', () => {
      const products = [createMockProduct({ id: '1', inventoryQuantity: 0 })]
      render(<ProductStats products={products} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('1')
    })

    it('excludes products with exactly 5 inventory', () => {
      const products = [
        createMockProduct({ id: '1', inventoryQuantity: 5 }),
        createMockProduct({ id: '2', inventoryQuantity: 6 }),
      ]
      render(<ProductStats products={products} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('0')
    })

    it('shows zero when all products have sufficient stock', () => {
      const products = [
        createMockProduct({ id: '1', inventoryQuantity: 10 }),
        createMockProduct({ id: '2', inventoryQuantity: 100 }),
      ]
      render(<ProductStats products={products} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('0')
    })
  })

  describe('Styling', () => {
    it('renders stat cards in a grid', () => {
      const { container } = render(<ProductStats products={[]} />)
      const grid = container.firstChild as HTMLElement
      expect(grid).toHaveClass('grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    it('renders four card elements', () => {
      const { container } = render(<ProductStats products={[]} />)
      const cards = container.querySelectorAll('.bg-card')
      expect(cards).toHaveLength(4)
    })
  })
})
