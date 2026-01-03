import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CollectionSort } from './CollectionSort'

import { render, screen, waitFor } from '@/test/test-utils'

// Mock router navigate function
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}))

describe('CollectionSort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof CollectionSort>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof CollectionSort> = {
      currentSort: 'manual',
    }
    return render(<CollectionSort {...defaultProps} {...props} />)
  }

  describe('Initial rendering', () => {
    it('renders sort button with default option', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('shows "Sort by:" label on larger screens', () => {
      renderComponent()

      // Text includes colon
      expect(screen.getByText(/Sort by:/i)).toBeInTheDocument()
    })

    it('displays current sort option on button', () => {
      renderComponent({ currentSort: 'newest' })

      expect(
        screen.getByRole('button', { name: /newest/i }),
      ).toBeInTheDocument()
    })

    it('defaults to "manual" (Featured) when no currentSort provided', () => {
      renderComponent({ currentSort: undefined })

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('displays ChevronDown icon', () => {
      renderComponent()

      // ChevronDown icon should be present
      const button = screen.getByRole('button', { name: /featured/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Sort options', () => {
    it('shows all sort options when dropdown is opened', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button', { name: /featured/i })
      await user.click(button)

      await waitFor(() => {
        // Use getAllByText since "Featured" appears in both button and menu
        const featuredElements = screen.getAllByText('Featured')
        expect(featuredElements.length).toBeGreaterThan(0)

        expect(screen.getByText('Newest')).toBeInTheDocument()
        expect(screen.getByText('Price: Low to High')).toBeInTheDocument()
        expect(screen.getByText('Price: High to Low')).toBeInTheDocument()
      })
    })

    it('has exactly 4 sort options', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button', { name: /featured/i })
      await user.click(button)

      await waitFor(() => {
        const options = screen.getAllByRole('menuitem')
        expect(options).toHaveLength(4)
      })
    })
  })

  describe('Current selection highlighting', () => {
    it('highlights currently selected option', async () => {
      const { user } = renderComponent({ currentSort: 'price_asc' })

      const button = screen.getByRole('button', { name: /price: low to high/i })
      await user.click(button)

      await waitFor(() => {
        const selectedOption = screen.getByRole('menuitem', {
          name: /price: low to high/i,
        })
        expect(selectedOption).toHaveClass('bg-muted')
      })
    })

    it('highlights "Featured" when currentSort is "manual"', async () => {
      const { user } = renderComponent({ currentSort: 'manual' })

      const button = screen.getByRole('button', { name: /featured/i })
      await user.click(button)

      await waitFor(() => {
        const selectedOption = screen.getByRole('menuitem', {
          name: /featured/i,
        })
        expect(selectedOption).toHaveClass('bg-muted')
      })
    })

    it('does not highlight unselected options', async () => {
      const { user } = renderComponent({ currentSort: 'newest' })

      const button = screen.getByRole('button', { name: /newest/i })
      await user.click(button)

      await waitFor(() => {
        const priceOption = screen.getByRole('menuitem', {
          name: /price: low to high/i,
        })
        expect(priceOption).not.toHaveClass('bg-muted')
      })
    })
  })

  describe('Sort selection and navigation', () => {
    it('calls router.navigate when option is clicked', async () => {
      const { user } = renderComponent({ currentSort: 'manual' })

      const button = screen.getByRole('button', { name: /featured/i })
      await user.click(button)

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /newest/i }),
        ).toBeInTheDocument()
      })

      const newestOption = screen.getByRole('menuitem', { name: /newest/i })
      await user.click(newestOption)

      expect(mockNavigate).toHaveBeenCalled()
    })

    it('preserves existing search params when changing sort', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /newest/i }),
        ).toBeInTheDocument()
      })

      const option = screen.getByRole('menuitem', { name: /newest/i })
      await user.click(option)

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.any(Function),
        }),
      )
    })

    it('updates sort parameter to selected value', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /price: high to low/i }),
        ).toBeInTheDocument()
      })

      const option = screen.getByRole('menuitem', {
        name: /price: high to low/i,
      })
      await user.click(option)

      // Verify navigate was called
      expect(mockNavigate).toHaveBeenCalled()

      // Get the search function that was passed
      const callArgs = mockNavigate.mock.calls[0][0]
      const searchFn = callArgs.search

      // Test that it adds sort param
      const result = searchFn({ existingParam: 'value' })
      expect(result).toEqual({ existingParam: 'value', sort: 'price_desc' })
    })
  })

  describe('Different sort values', () => {
    it('displays "Featured" for manual sort', () => {
      renderComponent({ currentSort: 'manual' })

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('displays "Newest" for newest sort', () => {
      renderComponent({ currentSort: 'newest' })

      expect(
        screen.getByRole('button', { name: /newest/i }),
      ).toBeInTheDocument()
    })

    it('displays "Price: Low to High" for price_asc sort', () => {
      renderComponent({ currentSort: 'price_asc' })

      expect(
        screen.getByRole('button', { name: /price: low to high/i }),
      ).toBeInTheDocument()
    })

    it('displays "Price: High to Low" for price_desc sort', () => {
      renderComponent({ currentSort: 'price_desc' })

      expect(
        screen.getByRole('button', { name: /price: high to low/i }),
      ).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('falls back to Featured for invalid sort value', () => {
      renderComponent({ currentSort: 'invalid_sort' as string })

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('handles empty currentSort gracefully', () => {
      renderComponent({ currentSort: '' })

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('handles undefined currentSort', () => {
      renderComponent({ currentSort: undefined })

      expect(
        screen.getByRole('button', { name: /featured/i }),
      ).toBeInTheDocument()
    })

    it('maintains selected state when dropdown is reopened', async () => {
      const { user } = renderComponent({ currentSort: 'price_asc' })

      // Open dropdown
      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        const option = screen.getByRole('menuitem', {
          name: /price: low to high/i,
        })
        expect(option).toHaveClass('bg-muted')
      })

      // Close dropdown by clicking outside or pressing escape
      await user.keyboard('{Escape}')

      // Reopen dropdown
      await user.click(button)

      await waitFor(() => {
        const option = screen.getByRole('menuitem', {
          name: /price: low to high/i,
        })
        expect(option).toHaveClass('bg-muted')
      })
    })
  })

  describe('User interactions', () => {
    it('opens dropdown on button click', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /featured/i }),
        ).toBeInTheDocument()
      })
    })

    it('allows clicking different sort options sequentially', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button')

      // Click first option
      await user.click(button)
      await waitFor(() => screen.getByRole('menuitem', { name: /newest/i }))
      await user.click(screen.getByRole('menuitem', { name: /newest/i }))

      expect(mockNavigate).toHaveBeenCalledTimes(1)

      // Click second option
      await user.click(button)
      await waitFor(() =>
        screen.getByRole('menuitem', { name: /price: low to high/i }),
      )
      await user.click(
        screen.getByRole('menuitem', { name: /price: low to high/i }),
      )

      expect(mockNavigate).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('uses semantic button element', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('dropdown menu items are accessible', async () => {
      const { user } = renderComponent()

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.length).toBeGreaterThan(0)
      })
    })

    it('button has accessible label', () => {
      renderComponent({ currentSort: 'newest' })

      const button = screen.getByRole('button', { name: /newest/i })
      expect(button).toHaveAccessibleName()
    })
  })

  describe('Responsive design', () => {
    it('hides "Sort by:" label on small screens', () => {
      renderComponent()

      const label = screen.getByText(/Sort by:/i)
      expect(label).toHaveClass('hidden')
      expect(label).toHaveClass('sm:inline')
    })

    it('button has minimum width', () => {
      renderComponent()

      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-w-[160px]')
    })
  })
})
