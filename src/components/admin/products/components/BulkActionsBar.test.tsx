import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BulkActionsBar } from './BulkActionsBar'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string, opts?: { count?: number }) =>
      opts?.count !== undefined
        ? str.replace('{{count}}', String(opts.count))
        : str,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('BulkActionsBar', () => {
  let queryClient: QueryClient
  const mockOnClearSelection = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof BulkActionsBar>> = {},
  ) => {
    const defaultProps = {
      selectedCount: 3,
      selectedIds: new Set(['id-1', 'id-2', 'id-3']),
      onClearSelection: mockOnClearSelection,
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <BulkActionsBar {...defaultProps} {...props} />
      </QueryClientProvider>,
    )
  }

  describe('Rendering', () => {
    it('renders nothing when selectedCount is 0', () => {
      const { container } = renderComponent({
        selectedCount: 0,
        selectedIds: new Set(),
      })
      expect(container.firstChild).toBeNull()
    })

    it('renders the bar when items are selected', () => {
      renderComponent()
      expect(screen.getByText('3 selected')).toBeInTheDocument()
    })

    it('displays correct selected count', () => {
      renderComponent({ selectedCount: 5 })
      expect(screen.getByText('5 selected')).toBeInTheDocument()
    })

    it('renders all action buttons', () => {
      renderComponent()
      expect(
        screen.getByRole('button', { name: /Activate/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Archive/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Delete/i }),
      ).toBeInTheDocument()
    })

    it('renders close button', () => {
      renderComponent()
      // The X button doesn't have text, but it's a button
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(4) // Activate, Archive, Delete, Close
    })
  })

  describe('Activate action', () => {
    it('calls the bulk API with activate action', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'activate',
            ids: ['id-1', 'id-2', 'id-3'],
          }),
        })
      })
    })

    it('shows success toast and clears selection on success', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3 items activated')
        expect(mockOnClearSelection).toHaveBeenCalled()
      })
    })
  })

  describe('Archive action', () => {
    it('calls the bulk API with archive action', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Archive/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'archive',
            ids: ['id-1', 'id-2', 'id-3'],
          }),
        })
      })
    })

    it('shows success toast for archive', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Archive/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3 items archived')
      })
    })
  })

  describe('Delete action', () => {
    it('calls the bulk API with delete action', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Delete/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'delete',
            ids: ['id-1', 'id-2', 'id-3'],
          }),
        })
      })
    })

    it('shows success toast for delete', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Delete/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3 items deleted')
      })
    })
  })

  describe('Error handling', () => {
    it('shows error toast when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      })
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update items')
      })
    })

    it('shows error toast when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update items')
      })
    })

    it('does not clear selection on error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      })
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
      expect(mockOnClearSelection).not.toHaveBeenCalled()
    })
  })

  describe('Clear selection', () => {
    it('calls onClearSelection when close button is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      // The close button is the last button (after Activate, Archive, Delete)
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[buttons.length - 1]

      await user.click(closeButton)

      expect(mockOnClearSelection).toHaveBeenCalled()
    })
  })

  describe('Loading state', () => {
    it('disables buttons while mutation is pending', async () => {
      // Make fetch hang to keep mutation pending
      mockFetch.mockImplementationOnce(
        () => new Promise(() => {}), // Never resolves
      )
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      // After click, buttons should be disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Activate/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /Archive/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled()
      })
    })
  })

  describe('Query invalidation', () => {
    it('invalidates products query on success', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Activate/i }))

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products'] })
      })
    })
  })
})
