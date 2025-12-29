import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProductStats } from './ProductStats'

import type { ProductStats as ProductStatsData } from '../../../../hooks/useProductStats'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

const createMockStats = (
  overrides: Partial<ProductStatsData> = {},
): ProductStatsData => ({
  totalProducts: 10,
  activeCount: 5,
  draftCount: 3,
  archivedCount: 2,
  lowStockCount: 1,
  ...overrides,
})

describe('ProductStats', () => {
  describe('Rendering', () => {
    it('renders all four stat cards', () => {
      const stats = createMockStats()
      render(<ProductStats stats={stats} />)

      expect(screen.getByText('Total Products')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Drafts')).toBeInTheDocument()
      expect(screen.getByText('Low Stock')).toBeInTheDocument()
    })

    it('renders with zero stats', () => {
      const stats = createMockStats({
        totalProducts: 0,
        activeCount: 0,
        draftCount: 0,
        archivedCount: 0,
        lowStockCount: 0,
      })
      render(<ProductStats stats={stats} />)

      const zeros = screen.getAllByText('0')
      expect(zeros).toHaveLength(4) // All 4 stats show 0
    })
  })

  describe('Total Products', () => {
    it('shows correct total count', () => {
      const stats = createMockStats({ totalProducts: 42 })
      render(<ProductStats stats={stats} />)

      const totalCard = screen.getByText('Total Products').parentElement
      expect(totalCard).toHaveTextContent('42')
    })

    it('shows zero when no products', () => {
      const stats = createMockStats({ totalProducts: 0 })
      render(<ProductStats stats={stats} />)

      const totalCard = screen.getByText('Total Products').parentElement
      expect(totalCard).toHaveTextContent('0')
    })
  })

  describe('Active count', () => {
    it('displays active count from stats', () => {
      const stats = createMockStats({ activeCount: 25 })
      render(<ProductStats stats={stats} />)

      const activeCard = screen.getByText('Active').parentElement
      expect(activeCard).toHaveTextContent('25')
    })

    it('shows zero when no active products', () => {
      const stats = createMockStats({ activeCount: 0 })
      render(<ProductStats stats={stats} />)

      const activeCard = screen.getByText('Active').parentElement
      expect(activeCard).toHaveTextContent('0')
    })
  })

  describe('Draft count', () => {
    it('displays draft count from stats', () => {
      const stats = createMockStats({ draftCount: 15 })
      render(<ProductStats stats={stats} />)

      const draftCard = screen.getByText('Drafts').parentElement
      expect(draftCard).toHaveTextContent('15')
    })

    it('shows zero when no draft products', () => {
      const stats = createMockStats({ draftCount: 0 })
      render(<ProductStats stats={stats} />)

      const draftCard = screen.getByText('Drafts').parentElement
      expect(draftCard).toHaveTextContent('0')
    })
  })

  describe('Low Stock count', () => {
    it('displays low stock count from stats', () => {
      const stats = createMockStats({ lowStockCount: 8 })
      render(<ProductStats stats={stats} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('8')
    })

    it('shows zero when no low stock products', () => {
      const stats = createMockStats({ lowStockCount: 0 })
      render(<ProductStats stats={stats} />)

      const lowStockCard = screen.getByText('Low Stock').parentElement
      expect(lowStockCard).toHaveTextContent('0')
    })
  })

  describe('Aggregate stats from API', () => {
    it('displays aggregate stats correctly (not paginated data)', () => {
      // This test verifies that we're using API-provided stats
      // rather than calculating from paginated page data
      const stats: ProductStatsData = {
        totalProducts: 1000,
        activeCount: 600,
        draftCount: 300,
        archivedCount: 100,
        lowStockCount: 50,
      }
      render(<ProductStats stats={stats} />)

      // These should show the aggregate counts, not page-level counts
      expect(screen.getByText('1000')).toBeInTheDocument()
      expect(screen.getByText('600')).toBeInTheDocument()
      expect(screen.getByText('300')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('renders stat cards in a grid', () => {
      const stats = createMockStats()
      const { container } = render(<ProductStats stats={stats} />)
      const grid = container.firstChild as HTMLElement
      expect(grid).toHaveClass('grid')
      expect(grid).toHaveClass('grid-cols-2')
    })

    it('renders four card elements', () => {
      const stats = createMockStats()
      const { container } = render(<ProductStats stats={stats} />)
      const cards = container.querySelectorAll('.bg-card')
      expect(cards).toHaveLength(4)
    })
  })
})
