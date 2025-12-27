import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BulkActionsBar } from './BulkActionsBar'
import {
  bulkDeleteCollectionsFn,
  bulkUpdateCollectionsStatusFn,
} from '../../../../server/collections'

vi.mock('../../../../server/collections', () => ({
  bulkDeleteCollectionsFn: vi.fn(),
  bulkUpdateCollectionsStatusFn: vi.fn(),
}))

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
    vi.mocked(bulkDeleteCollectionsFn).mockResolvedValue({
      success: true,
      count: 3,
    })
    vi.mocked(bulkUpdateCollectionsStatusFn).mockResolvedValue({
      success: true,
      count: 3,
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
        screen.getByRole('button', { name: /^Publish$/ }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Unpublish/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Delete/i }),
      ).toBeInTheDocument()
    })

    it('renders close button', () => {
      renderComponent()
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(4) // Publish, Unpublish, Delete, Close
    })
  })

  describe('Publish action', () => {
    it('calls bulkUpdateCollectionsStatusFn with publish action', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /^Publish$/ }))

      await waitFor(() => {
        expect(bulkUpdateCollectionsStatusFn).toHaveBeenCalled()
        const callArg = vi.mocked(bulkUpdateCollectionsStatusFn).mock
          .calls[0][0]
        expect(callArg.data).toEqual({
          ids: ['id-1', 'id-2', 'id-3'],
          action: 'publish',
        })
      })
    })

    it('shows success toast for publish', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /^Publish$/ }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3 items activated')
        expect(mockOnClearSelection).toHaveBeenCalled()
      })
    })
  })

  describe('Unpublish action', () => {
    it('calls bulkUpdateCollectionsStatusFn with unpublish action', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Unpublish/i }))

      await waitFor(() => {
        expect(bulkUpdateCollectionsStatusFn).toHaveBeenCalled()
        const callArg = vi.mocked(bulkUpdateCollectionsStatusFn).mock
          .calls[0][0]
        expect(callArg.data).toEqual({
          ids: ['id-1', 'id-2', 'id-3'],
          action: 'unpublish',
        })
      })
    })

    it('shows success toast for unpublish', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Unpublish/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3 items archived')
      })
    })
  })

  describe('Delete action', () => {
    it('calls bulkDeleteCollectionsFn', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Delete/i }))

      await waitFor(() => {
        expect(bulkDeleteCollectionsFn).toHaveBeenCalled()
        const callArg = vi.mocked(bulkDeleteCollectionsFn).mock.calls[0][0]
        expect(callArg.data).toEqual({ ids: ['id-1', 'id-2', 'id-3'] })
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
    it('shows error toast when delete fails', async () => {
      vi.mocked(bulkDeleteCollectionsFn).mockRejectedValueOnce(
        new Error('Failed'),
      )
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Delete/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete items')
      })
    })

    it('shows error toast when status update fails', async () => {
      vi.mocked(bulkUpdateCollectionsStatusFn).mockRejectedValueOnce(
        new Error('Failed'),
      )
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /^Publish$/ }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update items')
      })
    })

    it('does not clear selection on error', async () => {
      vi.mocked(bulkDeleteCollectionsFn).mockRejectedValueOnce(
        new Error('Failed'),
      )
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /Delete/i }))

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

      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[buttons.length - 1]

      await user.click(closeButton)

      expect(mockOnClearSelection).toHaveBeenCalled()
    })
  })

  describe('Query invalidation', () => {
    it('invalidates collections query on success', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByRole('button', { name: /^Publish$/ }))

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['collections'],
        })
      })
    })
  })
})
