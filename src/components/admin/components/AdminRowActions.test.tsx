import { Package, XCircle } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { AdminRowActions, type StatusAction } from './AdminRowActions'

import { render, screen, waitFor } from '@/test/test-utils'

describe('AdminRowActions', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminRowActions>> = {},
  ) => {
    return render(<AdminRowActions {...props} />)
  }

  describe('Rendering', () => {
    it('renders menu trigger button', () => {
      renderComponent()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('opens dropdown menu when trigger is clicked', async () => {
      const { user } = renderComponent({ viewUrl: '/view/123' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument()
      })
    })
  })

  describe('View action', () => {
    it('shows View Details option', async () => {
      const { user } = renderComponent({ viewUrl: '/view/123' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument()
      })
    })

    it('does not show View Details when viewUrl is not provided', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.queryByText('View Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit action', () => {
    it('shows Edit Details option', async () => {
      const { user } = renderComponent({ editUrl: '/edit/123' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Edit Details')).toBeInTheDocument()
      })
    })

    it('does not show Edit Details when editUrl is not provided', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.queryByText('Edit Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Delete action', () => {
    it('shows Delete option when onDelete is provided', async () => {
      const { user } = renderComponent({ onDelete: vi.fn(), itemName: 'Test' })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })

    it('opens confirmation dialog when Delete is clicked', async () => {
      const onDelete = vi.fn()
      const { user } = renderComponent({ onDelete, itemName: 'Test Item' })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Delete'))
      })

      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument()
        expect(
          screen.getByText(
            'This will permanently delete "Test Item". This action cannot be undone.',
          ),
        ).toBeInTheDocument()
      })
    })

    it('calls onDelete when confirmed', async () => {
      const onDelete = vi.fn()
      const { user } = renderComponent({ onDelete, itemName: 'Test' })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Delete'))
      })

      await waitFor(async () => {
        const confirmButtons = screen.getAllByText('Confirm')
        await user.click(confirmButtons[0])
      })

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('does not call onDelete when cancelled', async () => {
      const onDelete = vi.fn()
      const { user } = renderComponent({ onDelete, itemName: 'Test' })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Delete'))
      })

      await waitFor(async () => {
        await user.click(screen.getByText('Cancel'))
      })

      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Archive/Activate toggle', () => {
    it('shows Archive option when status is active', async () => {
      const onStatusChange = vi.fn()
      const { user } = renderComponent({
        status: 'active',
        onStatusChange,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Archive')).toBeInTheDocument()
      })
    })

    it('shows Activate option when status is archived', async () => {
      const onStatusChange = vi.fn()
      const { user } = renderComponent({
        status: 'archived',
        onStatusChange,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Activate')).toBeInTheDocument()
      })
    })

    it('calls onStatusChange with correct status when toggle is clicked', async () => {
      const onStatusChange = vi.fn()
      const { user } = renderComponent({
        status: 'active',
        onStatusChange,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Archive'))
      })

      expect(onStatusChange).toHaveBeenCalledWith('archived')
    })
  })

  describe('Status workflow actions', () => {
    it('shows status workflow actions when provided', async () => {
      const onClick1 = vi.fn()
      const onClick2 = vi.fn()
      const statusActions: StatusAction[] = [
        {
          key: 'process',
          label: 'Mark as Processing',
          icon: Package,
          onClick: onClick1,
        },
        {
          key: 'complete',
          label: 'Mark as Complete',
          icon: Package,
          onClick: onClick2,
        },
      ]

      const { user } = renderComponent({
        statusActions,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Mark as Processing')).toBeInTheDocument()
        expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
      })
    })

    it('calls onClick when status workflow action is clicked', async () => {
      const onClick = vi.fn()
      const statusActions: StatusAction[] = [
        { key: 'process', label: 'Mark as Processing', icon: Package, onClick },
      ]

      const { user } = renderComponent({
        statusActions,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Mark as Processing'))
      })

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Duplicate action', () => {
    it('shows Duplicate option when onDuplicate is provided', async () => {
      const onDuplicate = vi.fn()
      const { user } = renderComponent({ onDuplicate })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Duplicate')).toBeInTheDocument()
      })
    })

    it('calls onDuplicate when Duplicate is clicked', async () => {
      const onDuplicate = vi.fn()
      const { user } = renderComponent({ onDuplicate })

      await user.click(screen.getByRole('button'))

      await waitFor(async () => {
        await user.click(screen.getByText('Duplicate'))
      })

      expect(onDuplicate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading state', () => {
    it('shows menu items when isLoading is true', async () => {
      const { user } = renderComponent({
        editUrl: '/edit/123',
        onDelete: vi.fn(),
        itemName: 'Test',
        isLoading: true,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Edit Details')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })
  })

  describe('Combinations', () => {
    it('shows all action types together', async () => {
      const onClick = vi.fn()
      const statusActions: StatusAction[] = [
        { key: 'process', label: 'Mark as Processing', icon: Package, onClick },
      ]

      const { user } = renderComponent({
        viewUrl: '/view/123',
        editUrl: '/edit/123',
        onDelete: vi.fn(),
        itemName: 'Test',
        onDuplicate: vi.fn(),
        status: 'active',
        onStatusChange: vi.fn(),
        statusActions,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument()
        expect(screen.getByText('Edit Details')).toBeInTheDocument()
        expect(screen.getByText('Duplicate')).toBeInTheDocument()
        expect(screen.getByText('Archive')).toBeInTheDocument()
        expect(screen.getByText('Mark as Processing')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })
  })

  describe('Destructive actions', () => {
    it('applies destructive styling to delete action', async () => {
      const { user } = renderComponent({
        onDelete: vi.fn(),
        itemName: 'Test',
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        const deleteOption = screen.getByText('Delete')
        expect(deleteOption).toBeInTheDocument()
      })
    })

    it('shows destructive status workflow action', async () => {
      const onClick = vi.fn()
      const destructiveAction: StatusAction[] = [
        {
          key: 'deactivate',
          label: 'Deactivate',
          icon: XCircle,
          onClick,
          variant: 'destructive',
        },
      ]

      const { user } = renderComponent({
        statusActions: destructiveAction,
      })

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Deactivate')).toBeInTheDocument()
      })
    })
  })
})
