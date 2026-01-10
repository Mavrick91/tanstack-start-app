import { describe, expect, it, vi, beforeEach } from 'vitest'

import { SortableHeader } from './SortableHeader'

import { render, screen, waitFor } from '@/test/test-utils'

describe('SortableHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof SortableHeader<string>>> = {},
  ) => {
    const defaultProps = {
      label: 'Product Name',
      sortKey: 'name' as const,
      currentSortKey: 'name' as const,
      sortOrder: 'asc' as const,
      onSort: vi.fn(),
    }
    return render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              {...defaultProps}
              {...(props as typeof defaultProps)}
            />
          </tr>
        </thead>
      </table>,
    )
  }

  describe('Rendering', () => {
    it('renders table header cell', () => {
      const { container } = renderComponent()

      expect(container.querySelector('th')).toBeInTheDocument()
    })

    it('renders label text', () => {
      renderComponent({ label: 'Price' })

      expect(screen.getByText('Price')).toBeInTheDocument()
    })

    it('renders as button for clickability', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /product name/i }),
      ).toBeInTheDocument()
    })

    it('displays label in sentence case', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).not.toHaveClass('uppercase')
    })

    it('uses small font size', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-xs')
    })

    it('applies medium font weight', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('font-medium')
    })
  })

  describe('Sort icons', () => {
    it('shows arrow up icon when active and ascending', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      const arrowUp = container.querySelector('.lucide-arrow-up')
      expect(arrowUp).toBeInTheDocument()
    })

    it('shows arrow down icon when active and descending', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'desc',
      })

      const arrowDown = container.querySelector('.lucide-arrow-down')
      expect(arrowDown).toBeInTheDocument()
    })

    it('shows arrow up-down icon when not active', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
        sortOrder: 'asc',
      })

      const arrowUpDown = container.querySelector('.lucide-arrow-up-down')
      expect(arrowUpDown).toBeInTheDocument()
    })

    it('active ascending icon has coral color', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      const arrowUp = container.querySelector('.lucide-arrow-up')
      expect(arrowUp).toHaveClass('text-coral-500')
    })

    it('active descending icon has coral color', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'desc',
      })

      const arrowDown = container.querySelector('.lucide-arrow-down')
      expect(arrowDown).toHaveClass('text-coral-500')
    })

    it('inactive icon is initially hidden', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
      })

      const arrowUpDown = container.querySelector('.lucide-arrow-up-down')
      expect(arrowUpDown).toHaveClass('opacity-0')
    })

    it('inactive icon shows on hover', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
      })

      const arrowUpDown = container.querySelector('.lucide-arrow-up-down')
      expect(arrowUpDown).toHaveClass('group-hover/header:opacity-50')
    })

    it('all icons have correct size', () => {
      const { container, rerender } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      let icon = container.querySelector('.lucide-arrow-up')
      expect(icon).toHaveClass('w-3.5')
      expect(icon).toHaveClass('h-3.5')

      rerender(
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSortKey="name"
                sortOrder="desc"
                onSort={vi.fn()}
              />
            </tr>
          </thead>
        </table>,
      )

      icon = container.querySelector('.lucide-arrow-down')
      expect(icon).toHaveClass('w-3.5')
      expect(icon).toHaveClass('h-3.5')
    })
  })

  describe('Click interactions', () => {
    it('calls onSort when clicked', async () => {
      const onSort = vi.fn()
      const { user } = renderComponent({ onSort, sortKey: 'name' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledWith('name')
      })
    })

    it('calls onSort with correct sortKey', async () => {
      const onSort = vi.fn()
      const { user } = renderComponent({ onSort, sortKey: 'price' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledWith('price')
      })
    })

    it('calls onSort only once per click', async () => {
      const onSort = vi.fn()
      const { user } = renderComponent({ onSort })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledTimes(1)
      })
    })

    it('allows multiple clicks', async () => {
      const onSort = vi.fn()
      const { user } = renderComponent({ onSort, sortKey: 'name' })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByRole('button'))
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledTimes(3)
        expect(onSort).toHaveBeenCalledWith('name')
      })
    })

    it('calls onSort even when already active', async () => {
      const onSort = vi.fn()
      const { user } = renderComponent({
        onSort,
        sortKey: 'name',
        currentSortKey: 'name',
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalled()
      })
    })
  })

  describe('Active state', () => {
    it('is active when sortKey matches currentSortKey', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      // Active state shows colored arrow icon
      const arrowUp = container.querySelector('.lucide-arrow-up')
      expect(arrowUp).toHaveClass('text-coral-500')
    })

    it('is inactive when sortKey does not match currentSortKey', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
      })

      // Inactive state shows up-down arrow
      const arrowUpDown = container.querySelector('.lucide-arrow-up-down')
      expect(arrowUpDown).toBeInTheDocument()
    })

    it('switches icon when changing from inactive to active ascending', () => {
      const { container, rerender } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
      })

      expect(
        container.querySelector('.lucide-arrow-up-down'),
      ).toBeInTheDocument()

      rerender(
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSortKey="name"
                sortOrder="asc"
                onSort={vi.fn()}
              />
            </tr>
          </thead>
        </table>,
      )

      expect(container.querySelector('.lucide-arrow-up')).toBeInTheDocument()
      expect(
        container.querySelector('.lucide-arrow-up-down'),
      ).not.toBeInTheDocument()
    })

    it('toggles icon when changing from ascending to descending', () => {
      const { container, rerender } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      expect(container.querySelector('.lucide-arrow-up')).toBeInTheDocument()

      rerender(
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSortKey="name"
                sortOrder="desc"
                onSort={vi.fn()}
              />
            </tr>
          </thead>
        </table>,
      )

      expect(container.querySelector('.lucide-arrow-down')).toBeInTheDocument()
      expect(
        container.querySelector('.lucide-arrow-up'),
      ).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies hover effect to text', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:text-stone-700')
    })

    it('applies transition to colors', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-colors')
    })

    it('applies transition to icon opacity', () => {
      const { container } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'price',
      })

      const arrowUpDown = container.querySelector('.lucide-arrow-up-down')
      expect(arrowUpDown).toHaveClass('transition-opacity')
    })

    it('uses flex layout for button content', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('flex')
      expect(button).toHaveClass('items-center')
      expect(button).toHaveClass('gap-1')
    })

    it('applies text alignment to table header', () => {
      const { container } = renderComponent()

      const th = container.querySelector('th')
      expect(th).toHaveClass('text-left')
    })

    it('applies padding to table header', () => {
      const { container } = renderComponent()

      const th = container.querySelector('th')
      expect(th).toHaveClass('px-6')
      expect(th).toHaveClass('py-3')
    })

    it('uses stone text color by default', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-stone-500')
    })

    it('applies stone background to header', () => {
      const { container } = renderComponent()

      const th = container.querySelector('th')
      expect(th).toHaveClass('bg-stone-50')
    })
  })

  describe('Generic type support', () => {
    it('works with custom string union types', async () => {
      type SortKeys = 'name' | 'price' | 'stock'
      const onSort = vi.fn()

      const { user } = render(
        <table>
          <thead>
            <tr>
              <SortableHeader<SortKeys>
                label="Price"
                sortKey="price"
                currentSortKey="name"
                sortOrder="asc"
                onSort={onSort}
              />
            </tr>
          </thead>
        </table>,
      )

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledWith('price')
      })
    })

    it('handles different sortKeys across multiple headers', async () => {
      const onSort = vi.fn()

      const { user } = render(
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSortKey="name"
                sortOrder="asc"
                onSort={onSort}
              />
              <SortableHeader
                label="Price"
                sortKey="price"
                currentSortKey="name"
                sortOrder="asc"
                onSort={onSort}
              />
            </tr>
          </thead>
        </table>,
      )

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[1]) // Click price

      await waitFor(() => {
        expect(onSort).toHaveBeenCalledWith('price')
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty label', () => {
      renderComponent({ label: '' })

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('handles very long labels', () => {
      const longLabel = 'Very Long Column Header Name That Might Wrap'
      renderComponent({ label: longLabel })

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })

    it('handles special characters in labels', () => {
      renderComponent({ label: 'Price ($)' })

      expect(screen.getByText('Price ($)')).toBeInTheDocument()
    })

    it('handles labels with numbers', () => {
      renderComponent({ label: 'Quantity (0-100)' })

      expect(screen.getByText('Quantity (0-100)')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic table header element', () => {
      const { container } = renderComponent()

      expect(container.querySelector('th')).toBeInTheDocument()
    })

    it('button is keyboard accessible', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('label is part of button accessible name', () => {
      renderComponent({ label: 'Product Name' })

      const button = screen.getByRole('button', { name: /product name/i })
      expect(button).toHaveAccessibleName()
    })

    it('maintains accessibility with different sort states', () => {
      const { rerender } = renderComponent({
        sortKey: 'name',
        currentSortKey: 'name',
        sortOrder: 'asc',
      })

      expect(screen.getByRole('button')).toBeInTheDocument()

      rerender(
        <table>
          <thead>
            <tr>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSortKey="price"
                sortOrder="asc"
                onSort={vi.fn()}
              />
            </tr>
          </thead>
        </table>,
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Icon spacing', () => {
    it('icon container has fixed width', () => {
      renderComponent()

      // The span wrapper around icons has fixed dimensions
      const button = screen.getByRole('button')
      const iconWrapper = button.querySelector('span.w-3\\.5.h-3\\.5')
      expect(iconWrapper).toHaveClass('w-3.5')
      expect(iconWrapper).toHaveClass('h-3.5')
    })

    it('maintains consistent spacing between label and icon', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('gap-1')
    })
  })
})
