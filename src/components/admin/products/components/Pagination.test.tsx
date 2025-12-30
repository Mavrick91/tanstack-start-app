import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './Pagination'

import { render, screen } from '@/test/test-utils'

describe('Pagination', () => {
  const mockOnPageChange = vi.fn()

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof Pagination>> = {},
  ) => {
    const defaultProps = {
      currentPage: 1,
      totalPages: 5,
      totalItems: 50,
      onPageChange: mockOnPageChange,
    }
    return render(<Pagination {...defaultProps} {...props} />)
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

    it('displays correct item range for first page', () => {
      renderComponent({ currentPage: 1, totalItems: 50 })
      expect(screen.getByText('Showing 1–10 of 50')).toBeInTheDocument()
    })

    it('displays correct item range for middle page', () => {
      renderComponent({ currentPage: 3, totalItems: 50 })
      expect(screen.getByText('Showing 21–30 of 50')).toBeInTheDocument()
    })

    it('displays correct item range for last page with partial items', () => {
      renderComponent({ currentPage: 5, totalPages: 5, totalItems: 47 })
      expect(screen.getByText('Showing 41–47 of 47')).toBeInTheDocument()
    })
  })

  describe('Page buttons', () => {
    it('shows first and last page always', () => {
      renderComponent({ currentPage: 3, totalPages: 10 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })

    it('shows current page and adjacent pages', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
    })

    it('shows ellipsis when there are gaps', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      const ellipses = screen.getAllByText('…')
      expect(ellipses.length).toBeGreaterThanOrEqual(1)
    })

    it('highlights current page button', () => {
      renderComponent({ currentPage: 3, totalPages: 5 })
      const currentPageButton = screen.getByRole('button', { name: '3' })
      expect(currentPageButton).toHaveClass('bg-pink-500')
    })

    it('does not highlight other page buttons', () => {
      renderComponent({ currentPage: 3, totalPages: 5 })
      const otherPageButton = screen.getByRole('button', { name: '1' })
      expect(otherPageButton).not.toHaveClass('bg-pink-500')
    })
  })

  describe('Navigation buttons', () => {
    it('disables previous button on first page', () => {
      renderComponent({ currentPage: 1, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0] // First button is previous
      expect(prevButton).toBeDisabled()
    })

    it('enables previous button when not on first page', () => {
      renderComponent({ currentPage: 2, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      expect(prevButton).not.toBeDisabled()
    })

    it('disables next button on last page', () => {
      renderComponent({ currentPage: 5, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1] // Last button is next
      expect(nextButton).toBeDisabled()
    })

    it('enables next button when not on last page', () => {
      renderComponent({ currentPage: 4, totalPages: 5 })
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      expect(nextButton).not.toBeDisabled()
    })
  })

  describe('Click interactions', () => {
    it('calls onPageChange with previous page when clicking previous button', async () => {
      const { user } = renderComponent({ currentPage: 3, totalPages: 5 })

      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      await user.click(prevButton)

      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange with next page when clicking next button', async () => {
      const { user } = renderComponent({ currentPage: 3, totalPages: 5 })

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]
      await user.click(nextButton)

      expect(mockOnPageChange).toHaveBeenCalledWith(4)
    })

    it('calls onPageChange with page number when clicking page button', async () => {
      const { user } = renderComponent({ currentPage: 1, totalPages: 5 })

      await user.click(screen.getByRole('button', { name: '2' }))

      expect(mockOnPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange when clicking first page button', async () => {
      const { user } = renderComponent({ currentPage: 5, totalPages: 10 })

      await user.click(screen.getByRole('button', { name: '1' }))

      expect(mockOnPageChange).toHaveBeenCalledWith(1)
    })

    it('calls onPageChange when clicking last page button', async () => {
      const { user } = renderComponent({ currentPage: 1, totalPages: 10 })

      await user.click(screen.getByRole('button', { name: '10' }))

      expect(mockOnPageChange).toHaveBeenCalledWith(10)
    })
  })

  describe('Edge cases', () => {
    it('handles 2 total pages correctly', () => {
      renderComponent({ currentPage: 1, totalPages: 2, totalItems: 15 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.queryByText('…')).not.toBeInTheDocument()
    })

    it('handles 3 total pages without ellipsis', () => {
      renderComponent({ currentPage: 2, totalPages: 3, totalItems: 25 })
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
      expect(screen.queryByText('…')).not.toBeInTheDocument()
    })

    it('shows ellipsis only where needed with many pages', () => {
      renderComponent({ currentPage: 1, totalPages: 10 })
      // At page 1: should show 1, 2, …, 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
      expect(screen.getByText('…')).toBeInTheDocument()
    })

    it('shows two ellipses when current page is in middle of many pages', () => {
      renderComponent({ currentPage: 5, totalPages: 10 })
      const ellipses = screen.getAllByText('…')
      expect(ellipses).toHaveLength(2)
    })
  })
})
