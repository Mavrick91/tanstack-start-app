import { describe, expect, it, vi, beforeEach } from 'vitest'

import { StatusFilterTabs } from './StatusFilterTabs'

import { render, screen, waitFor } from '@/test/test-utils'

describe('StatusFilterTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof StatusFilterTabs<string>>> = {},
  ) => {
    const defaultProps = {
      options: defaultOptions,
      value: 'all',
      onChange: vi.fn(),
    }
    return render(
      <StatusFilterTabs
        {...defaultProps}
        {...(props as typeof defaultProps)}
      />,
    )
  }

  describe('Rendering', () => {
    it('renders all option buttons', () => {
      renderComponent()

      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('renders correct number of buttons', () => {
      renderComponent()

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })

    it('renders with custom options', () => {
      const customOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
      ]

      renderComponent({ options: customOptions, value: 'pending' })

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.queryByText('All')).not.toBeInTheDocument()
    })

    it('renders with single option', () => {
      const singleOption = [{ value: 'only', label: 'Only Option' }]

      renderComponent({ options: singleOption, value: 'only' })

      expect(screen.getByText('Only Option')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(1)
    })

    it('renders group container with role', () => {
      const { container } = renderComponent()

      const group = container.querySelector('[role="group"]')
      expect(group).toBeInTheDocument()
    })
  })

  describe('Active state highlighting', () => {
    it('highlights currently selected option', () => {
      renderComponent({ value: 'active' })

      const activeButton = screen.getByText('Active')
      expect(activeButton).toHaveClass('bg-white')
      expect(activeButton).toHaveClass('text-stone-900')
    })

    it('does not highlight unselected options', () => {
      renderComponent({ value: 'active' })

      const allButton = screen.getByText('All')
      expect(allButton).not.toHaveClass('bg-white')
      expect(allButton).toHaveClass('text-stone-500')
    })

    it('updates highlighting when value changes', () => {
      const { rerender } = renderComponent({ value: 'all' })

      let allButton = screen.getByText('All')
      expect(allButton).toHaveClass('bg-white')

      rerender(
        <StatusFilterTabs
          options={defaultOptions}
          value="active"
          onChange={vi.fn()}
        />,
      )

      allButton = screen.getByText('All')
      const activeButton = screen.getByText('Active')

      expect(allButton).not.toHaveClass('bg-white')
      expect(activeButton).toHaveClass('bg-white')
    })

    it('highlights first option when value matches', () => {
      renderComponent({ value: 'all' })

      const firstButton = screen.getByText('All')
      expect(firstButton).toHaveClass('bg-white')
    })

    it('highlights last option when value matches', () => {
      renderComponent({ value: 'inactive' })

      const lastButton = screen.getByText('Inactive')
      expect(lastButton).toHaveClass('bg-white')
    })
  })

  describe('Click interactions', () => {
    it('calls onChange when option is clicked', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const activeButton = screen.getByText('Active')
      await user.click(activeButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('active')
      })
    })

    it('calls onChange with correct value', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const inactiveButton = screen.getByText('Inactive')
      await user.click(inactiveButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('inactive')
      })
    })

    it('allows clicking already selected option', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ value: 'all', onChange })

      const allButton = screen.getByText('All')
      await user.click(allButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('all')
      })
    })

    it('calls onChange only once per click', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const activeButton = screen.getByText('Active')
      await user.click(activeButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
      })
    })

    it('allows clicking multiple options sequentially', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      await user.click(screen.getByText('Active'))
      await user.click(screen.getByText('Inactive'))
      await user.click(screen.getByText('All'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(3)
        expect(onChange).toHaveBeenNthCalledWith(1, 'active')
        expect(onChange).toHaveBeenNthCalledWith(2, 'inactive')
        expect(onChange).toHaveBeenNthCalledWith(3, 'all')
      })
    })
  })

  describe('Accessibility', () => {
    it('uses default aria-label for group', () => {
      const { container } = renderComponent()

      const group = container.querySelector('[role="group"]')
      expect(group).toHaveAttribute('aria-label', 'Filter by status')
    })

    it('uses custom aria-label when provided', () => {
      const { container } = renderComponent({
        ariaLabel: 'Filter by order status',
      })

      const group = container.querySelector('[role="group"]')
      expect(group).toHaveAttribute('aria-label', 'Filter by order status')
    })

    it('sets aria-pressed on selected button', () => {
      renderComponent({ value: 'active' })

      const activeButton = screen.getByText('Active')
      expect(activeButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('sets aria-pressed=false on unselected buttons', () => {
      renderComponent({ value: 'active' })

      const allButton = screen.getByText('All')
      const inactiveButton = screen.getByText('Inactive')

      expect(allButton).toHaveAttribute('aria-pressed', 'false')
      expect(inactiveButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('all buttons are keyboard accessible', () => {
      renderComponent()

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Generic type support', () => {
    it('works with custom string union types', async () => {
      type OrderStatus = 'pending' | 'processing' | 'completed'

      const options: { value: OrderStatus; label: string }[] = [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
      ]

      const onChange = vi.fn()
      const { user } = render(
        <StatusFilterTabs
          options={options}
          value="pending"
          onChange={onChange}
        />,
      )

      await user.click(screen.getByText('Processing'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('processing')
      })
    })

    it('works with numeric string values', async () => {
      const options = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
      ]

      const onChange = vi.fn()
      const { user } = render(
        <StatusFilterTabs options={options} value="1" onChange={onChange} />,
      )

      await user.click(screen.getByText('Option 2'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('2')
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty options array', () => {
      renderComponent({ options: [] })

      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('handles very long option labels', () => {
      const longLabel = 'Very Long Option Label That Could Wrap'
      const options = [{ value: 'long', label: longLabel }]

      renderComponent({ options, value: 'long' })

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })

    it('handles special characters in labels', () => {
      const options = [{ value: 'special', label: 'Items (10+)' }]

      renderComponent({ options, value: 'special' })

      expect(screen.getByText('Items (10+)')).toBeInTheDocument()
    })

    it('handles value not in options list', () => {
      renderComponent({ value: 'nonexistent' })

      // No button should be highlighted
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('bg-white')
      })
    })

    it('handles duplicate values in options', async () => {
      const options = [
        { value: 'duplicate', label: 'First' },
        { value: 'duplicate', label: 'Second' },
      ]

      const onChange = vi.fn()
      const { user } = renderComponent({
        options,
        value: 'duplicate',
        onChange,
      })

      // Both buttons should be highlighted
      const firstButton = screen.getByText('First')
      const secondButton = screen.getByText('Second')

      expect(firstButton).toHaveClass('bg-white')
      expect(secondButton).toHaveClass('bg-white')

      // Clicking should still work
      await user.click(firstButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('duplicate')
      })
    })
  })

  describe('Styling', () => {
    it('applies hover styles to unselected buttons', () => {
      renderComponent({ value: 'all' })

      const activeButton = screen.getByText('Active')
      expect(activeButton).toHaveClass('hover:text-stone-700')
    })

    it('applies transition classes to all buttons', () => {
      renderComponent()

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-all')
      })
    })

    it('applies consistent padding to all buttons', () => {
      renderComponent()

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('px-3.5')
        expect(button).toHaveClass('py-1.5')
      })
    })

    it('applies rounded corners to group container', () => {
      const { container } = renderComponent()

      const group = container.querySelector('[role="group"]')
      expect(group).toHaveClass('rounded-lg')
    })
  })

  describe('Multiple tabs with different states', () => {
    it('handles many options efficiently', async () => {
      const manyOptions = Array.from({ length: 10 }, (_, i) => ({
        value: `option${i}`,
        label: `Option ${i}`,
      }))

      const onChange = vi.fn()
      const { user } = renderComponent({
        options: manyOptions,
        value: 'option0',
        onChange,
      })

      expect(screen.getAllByRole('button')).toHaveLength(10)

      await user.click(screen.getByText('Option 5'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('option5')
      })
    })

    it('renders two options correctly', () => {
      const twoOptions = [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]

      renderComponent({ options: twoOptions, value: 'yes' })

      expect(screen.getByText('Yes')).toHaveClass('bg-white')
      expect(screen.getByText('No')).not.toHaveClass('bg-white')
    })
  })
})
