import { describe, expect, it, vi } from 'vitest'

import { AdminNoResults } from './AdminNoResults'

import { render, screen } from '@/test/test-utils'

describe('AdminNoResults', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminNoResults>> = {},
  ) => {
    const defaultProps = {
      onClear: vi.fn(),
    }
    return render(<AdminNoResults {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders default message when no custom message provided', () => {
      renderComponent()

      expect(
        screen.getByText('No products match your filters.'),
      ).toBeInTheDocument()
    })

    it('renders custom message when provided', () => {
      renderComponent({
        message: 'No orders found for this search',
      })

      expect(
        screen.getByText('No orders found for this search'),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('No products match your filters.'),
      ).not.toBeInTheDocument()
    })

    it('handles empty string as custom message', () => {
      renderComponent({ message: '' })

      // Empty string is falsy, so it uses the default message
      expect(
        screen.getByText('No products match your filters.'),
      ).toBeInTheDocument()
    })

    it('renders default clear button label when no custom label provided', () => {
      renderComponent()

      const button = screen.getByRole('button', { name: 'Clear filters' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Clear Filters')
    })

    it('renders custom clear button label when provided', () => {
      renderComponent({ clearLabel: 'Reset Search' })

      expect(
        screen.getByRole('button', { name: 'Reset Search' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Clear filters' }),
      ).not.toBeInTheDocument()
    })

    it('renders search icon', () => {
      const { container } = renderComponent()

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-5', 'h-5', 'text-stone-400')
    })
  })

  describe('Click interactions', () => {
    it('calls onClear when button is clicked', async () => {
      const onClear = vi.fn()
      const { user } = renderComponent({ onClear })

      const button = screen.getByRole('button', { name: 'Clear filters' })
      await user.click(button)

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it('calls onClear multiple times when clicked multiple times', async () => {
      const onClear = vi.fn()
      const { user } = renderComponent({ onClear })

      const button = screen.getByRole('button', { name: 'Clear filters' })
      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(onClear).toHaveBeenCalledTimes(3)
    })
  })

  describe('Styling', () => {
    it('has correct container styling', () => {
      const { container } = renderComponent()

      const mainContainer = container.querySelector(
        '.text-center.py-10.bg-white.border.border-stone-200.rounded-2xl.shadow-sm',
      )
      expect(mainContainer).toBeInTheDocument()
    })

    it('renders icon wrapper with correct styling', () => {
      const { container } = renderComponent()

      const iconWrapper = container.querySelector(
        '.w-12.h-12.bg-stone-100.rounded-xl',
      )
      expect(iconWrapper).toBeInTheDocument()
    })

    it('sets aria-label to default when no custom clearLabel provided', () => {
      renderComponent()

      const button = screen.getByRole('button', { name: 'Clear filters' })
      expect(button).toHaveAttribute('aria-label', 'Clear filters')
    })

    it('sets aria-label to custom clearLabel when provided', () => {
      renderComponent({ clearLabel: 'Reset Search' })

      const button = screen.getByRole('button', { name: 'Reset Search' })
      expect(button).toHaveAttribute('aria-label', 'Reset Search')
    })
  })

  describe('Edge cases', () => {
    it('handles long custom message', () => {
      const longMessage =
        'No products match your search criteria. Try adjusting your filters or search terms to find what you are looking for.'

      renderComponent({ message: longMessage })

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('handles special characters in custom message', () => {
      renderComponent({
        message: 'No results found! Try searching for something else...',
      })

      expect(
        screen.getByText(
          'No results found! Try searching for something else...',
        ),
      ).toBeInTheDocument()
    })

    it('renders all elements together with custom props', async () => {
      const onClear = vi.fn()
      const { user } = renderComponent({
        message: 'No customers found',
        clearLabel: 'Clear Search',
        onClear,
      })

      expect(screen.getByText('No customers found')).toBeInTheDocument()

      const button = screen.getByRole('button', { name: 'Clear Search' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Clear Search')

      await user.click(button)
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })
})
