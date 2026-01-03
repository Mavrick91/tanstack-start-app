import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AdminFilterSelect } from './AdminFilterSelect'

import { render } from '@/test/test-utils'

describe('AdminFilterSelect', () => {
  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminFilterSelect>> = {},
  ) => {
    const defaultProps = {
      label: 'Status',
      value: 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      onChange: vi.fn(),
      ariaLabel: 'Filter by status',
    }

    return render(<AdminFilterSelect {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders the label', () => {
      renderComponent({ label: 'Payment Status' })

      expect(screen.getByText('Payment Status')).toBeInTheDocument()
    })

    it('renders the select trigger with current value', () => {
      renderComponent({
        value: 'active',
        options: [
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
        ],
      })

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('applies aria-label to the trigger', () => {
      renderComponent({ ariaLabel: 'Filter by payment' })

      expect(screen.getByRole('combobox')).toHaveAccessibleName(
        'Filter by payment',
      )
    })

    it('applies custom className to wrapper', () => {
      const { container } = renderComponent({ className: 'custom-class' })

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('User interactions', () => {
    it('calls onChange when a new option is selected', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      // Open the select
      await user.click(screen.getByRole('combobox'))

      // Click on "Active" option
      const activeOption = await screen.findByRole('option', { name: 'Active' })
      await user.click(activeOption)

      expect(onChange).toHaveBeenCalledWith('active')
    })

    it('displays all options when opened', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))

      expect(
        await screen.findByRole('option', { name: 'All' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Inactive' }),
      ).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles empty options array', () => {
      renderComponent({ options: [] })

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('handles very long label text', () => {
      const longLabel = 'This is a very long label that might overflow'
      renderComponent({ label: longLabel })

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })

    it('handles option with same value and label', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({
        options: [{ value: 'test', label: 'test' }],
        onChange,
      })

      await user.click(screen.getByRole('combobox'))
      await user.click(await screen.findByRole('option', { name: 'test' }))

      expect(onChange).toHaveBeenCalledWith('test')
    })
  })
})
