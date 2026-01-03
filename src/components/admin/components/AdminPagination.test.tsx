import { describe, expect, it, vi } from 'vitest'

import { AdminPagination } from './AdminPagination'

import { render, screen } from '@/test/test-utils'

describe('AdminPagination', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminPagination>> = {},
  ) => {
    const defaultProps = {
      currentPage: 1,
      totalPages: 5,
      totalItems: 50,
      onPageChange: vi.fn(),
    }
    return render(<AdminPagination {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders nothing when totalPages is 1', () => {
      const { container } = renderComponent({ totalPages: 1 })
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when totalPages is 0', () => {
      const { container } = renderComponent({ totalPages: 0, totalItems: 0 })
      expect(container.firstChild).toBeNull()
    })

    it('renders when totalPages is greater than 1', () => {
      renderComponent({ totalPages: 2 })
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('displays correct range text for first page', () => {
      renderComponent({ currentPage: 1 })
      expect(screen.getByText('Showing 1–10 of 50')).toBeInTheDocument()
    })

    it('displays correct range text for second page', () => {
      renderComponent({ currentPage: 2 })
      expect(screen.getByText('Showing 11–20 of 50')).toBeInTheDocument()
    })

    it('displays correct range text for last page', () => {
      renderComponent({ currentPage: 5 })
      expect(screen.getByText('Showing 41–50 of 50')).toBeInTheDocument()
    })

    it('displays correct range when items do not fill last page', () => {
      renderComponent({
        currentPage: 5,
        totalPages: 5,
        totalItems: 47,
      })
      expect(screen.getByText('Showing 41–47 of 47')).toBeInTheDocument()
    })

    it('uses custom itemsPerPage for range calculation', () => {
      renderComponent({
        currentPage: 1,
        totalItems: 100,
        itemsPerPage: 20,
      })
      expect(screen.getByText('Showing 1–20 of 100')).toBeInTheDocument()
    })

    it('calculates range correctly with custom itemsPerPage on page 2', () => {
      renderComponent({
        currentPage: 2,
        totalItems: 100,
        itemsPerPage: 20,
      })
      expect(screen.getByText('Showing 21–40 of 100')).toBeInTheDocument()
    })
  })

  describe('Page buttons', () => {
    it('shows first and last page always', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })

    it('shows current page and adjacent pages', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
    })

    it('shows ellipsis when there is a gap in page numbers', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      const ellipses = screen.getAllByText('…')
      expect(ellipses.length).toBeGreaterThan(0)
    })

    it('does not show ellipsis when pages are consecutive', () => {
      renderComponent({ currentPage: 2, totalPages: 4 })
      expect(screen.queryByText('…')).not.toBeInTheDocument()
    })

    it('shows two ellipses when current page is in middle of many pages', () => {
      renderComponent({ currentPage: 50, totalPages: 100 })
      const ellipses = screen.getAllByText('…')
      expect(ellipses).toHaveLength(2)
    })

    it('highlights current page button', () => {
      renderComponent({ currentPage: 3, totalPages: 5 })
      const currentPageButton = screen.getByRole('button', { name: '3' })
      expect(currentPageButton).toHaveClass('bg-pink-500')
    })

    it('does not highlight other page buttons', () => {
      renderComponent({ currentPage: 3, totalPages: 5 })
      const otherPageButton = screen.getByRole('button', { name: '2' })
      expect(otherPageButton).not.toHaveClass('bg-pink-500')
    })
  })

  describe('Navigation buttons', () => {
    it('disables previous button on first page', () => {
      renderComponent({ currentPage: 1 })
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      expect(prevButton).toBeDisabled()
    })

    it('enables previous button when not on first page', () => {
      renderComponent({ currentPage: 2 })
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      expect(prevButton).not.toBeDisabled()
    })

    it('disables next button on last page', () => {
      renderComponent({ currentPage: 5, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      expect(nextButton).toBeDisabled()
    })

    it('enables next button when not on last page', () => {
      renderComponent({ currentPage: 1, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      expect(nextButton).not.toBeDisabled()
    })
  })

  describe('Click interactions', () => {
    it('calls onPageChange with previous page when previous button clicked', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 3,
        onPageChange,
      })

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange with next page when next button clicked', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 2,
        onPageChange,
      })

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      await user.click(nextButton)

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('calls onPageChange with page number when page button clicked', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 1,
        onPageChange,
      })

      const pageButton = screen.getByRole('button', { name: '2' })
      await user.click(pageButton)

      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('does not call onPageChange when previous button is disabled', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 1,
        onPageChange,
      })

      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      await user.click(prevButton)

      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('does not call onPageChange when next button is disabled', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 5,
        totalPages: 5,
        onPageChange,
      })

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      await user.click(nextButton)

      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('calls onPageChange when clicking on current page', async () => {
      const onPageChange = vi.fn()
      const { user } = renderComponent({
        currentPage: 3,
        totalPages: 5,
        onPageChange,
      })

      const currentPageButton = screen.getByRole('button', { name: '3' })
      await user.click(currentPageButton)

      expect(onPageChange).toHaveBeenCalledWith(3)
    })
  })

  describe('Edge cases', () => {
    it('handles totalPages of 2', () => {
      renderComponent({ currentPage: 1, totalPages: 2 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument()
    })

    it('handles totalPages of 3', () => {
      renderComponent({ currentPage: 2, totalPages: 3 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
      expect(screen.queryByText('…')).not.toBeInTheDocument()
    })

    it('handles large number of pages', () => {
      renderComponent({
        currentPage: 50,
        totalPages: 100,
        totalItems: 1000,
      })

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '49' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '51' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument()
    })

    it('renders with selectedCount of 1', () => {
      renderComponent({ currentPage: 1, totalPages: 1, totalItems: 1 })
      const { container } = renderComponent({ currentPage: 1, totalPages: 1 })
      expect(container.firstChild).toBeNull()
    })
  })
})
