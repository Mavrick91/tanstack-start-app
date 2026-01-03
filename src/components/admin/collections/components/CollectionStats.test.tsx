import { describe, expect, it } from 'vitest'

import { CollectionStats } from './CollectionStats'

import { render, screen } from '@/test/test-utils'

describe('CollectionStats', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof CollectionStats>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof CollectionStats> = {
      stats: {
        total: 10,
        active: 7,
        draft: 3,
        productsInCollections: 45,
      },
      isLoading: false,
    }
    return render(<CollectionStats {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders all four stat cards', () => {
      renderComponent()

      expect(screen.getByText('Total Collections')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Drafts')).toBeInTheDocument()
      expect(screen.getByText('Products in Collections')).toBeInTheDocument()
    })

    it('displays correct stat values', () => {
      renderComponent({
        stats: {
          total: 25,
          active: 18,
          draft: 7,
          productsInCollections: 132,
        },
      })

      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('18')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('132')).toBeInTheDocument()
    })

    it('handles zero values correctly', () => {
      renderComponent({
        stats: {
          total: 0,
          active: 0,
          draft: 0,
          productsInCollections: 0,
        },
      })

      // Should show zeros, not hide or error
      const zeroValues = screen.getAllByText('0')
      expect(zeroValues.length).toBeGreaterThanOrEqual(4)
    })

    it('handles large numbers correctly', () => {
      renderComponent({
        stats: {
          total: 9999,
          active: 8888,
          draft: 1111,
          productsInCollections: 100000,
        },
      })

      expect(screen.getByText('9999')).toBeInTheDocument()
      expect(screen.getByText('8888')).toBeInTheDocument()
      expect(screen.getByText('1111')).toBeInTheDocument()
      expect(screen.getByText('100000')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('shows skeleton loaders when loading', () => {
      const { container } = renderComponent({ isLoading: true })

      // AdminStatsGrid shows skeleton loaders with animate-pulse
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)

      // Should show skeleton placeholders, not actual stat values
      expect(screen.queryByText('Total Collections')).not.toBeInTheDocument()
      expect(screen.queryByText('10')).not.toBeInTheDocument()
    })

    it('shows actual data when not loading', () => {
      const { container } = renderComponent({ isLoading: false })

      // Should show real values, not loading skeletons
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBe(0)

      // Should display actual stat labels and values
      expect(screen.getByText('Total Collections')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })

  describe('Icons and colors', () => {
    it('uses correct color for each stat card', () => {
      const { container } = renderComponent()

      // Check that different colors are applied
      // This catches if all cards have the same color (common bug)
      const cards = container.querySelectorAll('[class*="bg-"]')
      expect(cards.length).toBeGreaterThan(0)

      // Should have variety of colors (pink, emerald, amber, violet)
      const classes = Array.from(cards).map((card) => card.className)
      const hasMultipleColors =
        classes.some((c) => c.includes('pink')) &&
        classes.some((c) => c.includes('emerald')) &&
        classes.some((c) => c.includes('amber')) &&
        classes.some((c) => c.includes('violet'))

      expect(hasMultipleColors).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('handles stats where active + draft does not equal total', () => {
      // This could indicate a data inconsistency bug
      renderComponent({
        stats: {
          total: 10,
          active: 3,
          draft: 2, // 3 + 2 = 5, but total is 10
          productsInCollections: 45,
        },
      })

      // Should still render without errors
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('handles negative values gracefully', () => {
      // Shouldn't happen, but component should handle it
      renderComponent({
        stats: {
          total: -1,
          active: -2,
          draft: -3,
          productsInCollections: -4,
        },
      })

      // Should render the negative numbers
      expect(screen.getByText('-1')).toBeInTheDocument()
      expect(screen.getByText('-2')).toBeInTheDocument()
    })
  })

  describe('Integration with AdminStatsGrid', () => {
    it('renders within AdminStatsGrid component', () => {
      const { container } = renderComponent()

      // Should render using AdminStatsGrid
      // Check for grid layout or AdminStatsGrid specific classes
      const grid = container.querySelector('[class*="grid"]')
      expect(grid).toBeInTheDocument()
    })

    it('passes exactly 4 stats to AdminStatsGrid', () => {
      renderComponent()

      // Should have exactly 4 stat cards visible
      expect(screen.getByText('Total Collections')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Drafts')).toBeInTheDocument()
      expect(screen.getByText('Products in Collections')).toBeInTheDocument()

      // No duplicates
      const totalCards = screen.getAllByText(
        /^(Total Collections|Active|Drafts|Products in Collections)$/,
      )
      expect(totalCards).toHaveLength(4)
    })
  })
})
