import { Archive, Mail, Trash2 } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { AdminBulkActionsBar, type BulkAction } from './AdminBulkActionsBar'

import { render, screen } from '@/test/test-utils'

describe('AdminBulkActionsBar', () => {
  const mockActions: BulkAction[] = [
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
    },
    {
      key: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'default',
    },
    {
      key: 'email',
      label: 'Send Email',
      icon: Mail,
    },
  ]

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminBulkActionsBar>> = {},
  ) => {
    const defaultProps = {
      selectedCount: 3,
      actions: mockActions,
      onAction: vi.fn(),
      onClear: vi.fn(),
    }
    return render(<AdminBulkActionsBar {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders nothing when selectedCount is 0', () => {
      const { container } = renderComponent({ selectedCount: 0 })
      expect(container.firstChild).toBeNull()
    })

    it('renders the bar when items are selected', () => {
      renderComponent()
      expect(screen.getByText('3 selected')).toBeInTheDocument()
    })

    it('displays correct selected count', () => {
      renderComponent({ selectedCount: 10 })
      expect(screen.getByText('10 selected')).toBeInTheDocument()
    })

    it('renders all action buttons', () => {
      renderComponent()
      expect(
        screen.getByRole('button', { name: /delete/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /archive/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /send email/i }),
      ).toBeInTheDocument()
    })

    it('renders clear button', () => {
      renderComponent()
      expect(
        screen.getByRole('button', { name: 'Clear selection' }),
      ).toBeInTheDocument()
    })

    it('handles empty actions array', () => {
      renderComponent({ actions: [] })
      expect(screen.getByText('3 selected')).toBeInTheDocument()
      // Should only have the clear button
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
    })

    it('handles single action', () => {
      const singleAction: BulkAction[] = [
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive',
        },
      ]
      renderComponent({ actions: singleAction })
      expect(
        screen.getByRole('button', { name: /delete/i }),
      ).toBeInTheDocument()
    })
  })

  describe('Click interactions', () => {
    it('calls onAction with correct key when action button is clicked', async () => {
      const onAction = vi.fn()
      const { user } = renderComponent({ onAction })

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(onAction).toHaveBeenCalledWith('delete')
      expect(onAction).toHaveBeenCalledTimes(1)
    })

    it('calls onAction for different actions', async () => {
      const onAction = vi.fn()
      const { user } = renderComponent({ onAction })

      await user.click(screen.getByRole('button', { name: /archive/i }))
      expect(onAction).toHaveBeenCalledWith('archive')

      await user.click(screen.getByRole('button', { name: /send email/i }))
      expect(onAction).toHaveBeenCalledWith('email')

      expect(onAction).toHaveBeenCalledTimes(2)
    })

    it('calls onClear when clear button is clicked', async () => {
      const onClear = vi.fn()
      const { user } = renderComponent({ onClear })

      await user.click(screen.getByRole('button', { name: 'Clear selection' }))

      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading state', () => {
    it('disables action buttons when isPending is true', () => {
      renderComponent({ isPending: true })

      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /archive/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /send email/i })).toBeDisabled()
    })

    it('disables clear button when isPending is true', () => {
      renderComponent({ isPending: true })

      expect(
        screen.getByRole('button', { name: 'Clear selection' }),
      ).toBeDisabled()
    })

    it('enables all buttons when isPending is false', () => {
      renderComponent({ isPending: false })

      expect(screen.getByRole('button', { name: /delete/i })).not.toBeDisabled()
      expect(
        screen.getByRole('button', { name: /archive/i }),
      ).not.toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Clear selection' }),
      ).not.toBeDisabled()
    })

    it('does not call onAction when button is disabled', async () => {
      const onAction = vi.fn()
      const { user } = renderComponent({ onAction, isPending: true })

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(onAction).not.toHaveBeenCalled()
    })

    it('does not call onClear when clear button is disabled', async () => {
      const onClear = vi.fn()
      const { user } = renderComponent({ onClear, isPending: true })

      await user.click(screen.getByRole('button', { name: 'Clear selection' }))

      expect(onClear).not.toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('applies destructive styling for destructive variant', () => {
      renderComponent()

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      expect(deleteButton).toHaveClass('text-red-400')
      expect(deleteButton).toHaveClass('hover:bg-red-500/20')
    })

    it('applies default styling for non-destructive actions', () => {
      renderComponent()

      const archiveButton = screen.getByRole('button', { name: /archive/i })
      expect(archiveButton).toHaveClass('text-white')
      expect(archiveButton).toHaveClass('hover:bg-white/10')
    })
  })
})
