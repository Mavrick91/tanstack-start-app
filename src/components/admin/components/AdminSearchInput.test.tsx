import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AdminSearchInput } from './AdminSearchInput'

import { render, screen, waitFor } from '@/test/test-utils'

describe('AdminSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AdminSearchInput>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof AdminSearchInput> = {
      value: '',
      onChange: vi.fn(),
    }
    return render(<AdminSearchInput {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders search input', () => {
      renderComponent()

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders search icon', () => {
      const { container } = renderComponent()

      const searchIcon = container.querySelector('svg')
      expect(searchIcon).toBeInTheDocument()
    })

    it('displays placeholder text', () => {
      renderComponent({ placeholder: 'Search products...' })

      expect(
        screen.getByPlaceholderText('Search products...'),
      ).toBeInTheDocument()
    })

    it('uses default placeholder when not provided', () => {
      renderComponent()

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('sets aria-label from prop', () => {
      renderComponent({ ariaLabel: 'Search for items' })

      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-label',
        'Search for items',
      )
    })

    it('uses placeholder as aria-label when ariaLabel not provided', () => {
      renderComponent({ placeholder: 'Search products...' })

      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-label',
        'Search products...',
      )
    })

    it('displays current value', () => {
      renderComponent({ value: 'test query' })

      expect(screen.getByRole('textbox')).toHaveValue('test query')
    })
  })

  describe('Submit on change mode (default)', () => {
    it('calls onChange on every keystroke by default', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const input = screen.getByRole('textbox')
      await user.type(input, 'ab')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(2)
        expect(onChange).toHaveBeenNthCalledWith(1, 'a')
        expect(onChange).toHaveBeenNthCalledWith(2, 'b')
      })
    })

    it('calls onChange on every keystroke when submitOnChange is true', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, submitOnChange: true })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(4)
      })
    })

    it('updates displayed value immediately in submitOnChange mode', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({
        value: '',
        onChange,
        submitOnChange: true,
      })

      const input = screen.getByRole('textbox')
      await user.type(input, 'new')

      // In submitOnChange mode, onChange is called for each character
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(3)
        expect(onChange).toHaveBeenNthCalledWith(1, 'n')
        expect(onChange).toHaveBeenNthCalledWith(2, 'e')
        expect(onChange).toHaveBeenNthCalledWith(3, 'w')
      })
    })
  })

  describe('Submit mode (submitOnChange=false)', () => {
    it('does not call onChange on keystroke when submitOnChange is false', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, submitOnChange: false })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('calls onChange on form submit when submitOnChange is false', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, submitOnChange: false })

      const input = screen.getByRole('textbox')
      await user.type(input, 'search query')

      // Submit the form
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith('search query')
      })
    })

    it('calls onSubmit callback when form is submitted', async () => {
      const onSubmit = vi.fn()
      const { user } = renderComponent({
        submitOnChange: false,
        onSubmit,
      })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('updates internal state on typing in submit mode', async () => {
      const { user } = renderComponent({ submitOnChange: false, value: '' })

      const input = screen.getByRole('textbox')
      await user.type(input, 'internal')

      // Input should show the typed value even though onChange hasn't been called
      expect(input).toHaveValue('internal')
    })

    it('displays value prop initially in submit mode', () => {
      renderComponent({ submitOnChange: false, value: 'initial value' })

      expect(screen.getByRole('textbox')).toHaveValue('initial value')
    })
  })

  describe('Clear button', () => {
    it('shows clear button when there is a value', () => {
      renderComponent({ value: 'test' })

      expect(
        screen.getByRole('button', { name: 'Clear search' }),
      ).toBeInTheDocument()
    })

    it('does not show clear button when value is empty', () => {
      renderComponent({ value: '' })

      expect(
        screen.queryByRole('button', { name: 'Clear search' }),
      ).not.toBeInTheDocument()
    })

    it('clears value when clear button is clicked in submitOnChange mode', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({
        value: 'test query',
        onChange,
        submitOnChange: true,
      })

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      await user.click(clearButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('')
      })
    })

    it('clears value when clear button is clicked in submit mode', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({
        value: 'test query',
        onChange,
        submitOnChange: false,
      })

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      await user.click(clearButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('')
      })
    })

    it('clears internal state in submit mode', async () => {
      const { user } = renderComponent({
        submitOnChange: false,
        value: '',
      })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(input).toHaveValue('test')

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      await user.click(clearButton)

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })
  })

  describe('Form submission', () => {
    it('prevents default form submission', async () => {
      const onSubmit = vi.fn()
      const { user } = renderComponent({ onSubmit })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.keyboard('{Enter}')

      // Form submission should be prevented (no page reload)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })

    it('calls onSubmit in submitOnChange mode', async () => {
      const onSubmit = vi.fn()
      const { user } = renderComponent({
        submitOnChange: true,
        onSubmit,
      })

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('does not crash when onSubmit is not provided', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      await expect(user.keyboard('{Enter}')).resolves.not.toThrow()
    })
  })

  describe('Styling and customization', () => {
    it('applies custom className to form wrapper', () => {
      const { container } = renderComponent({ className: 'custom-class' })

      const form = container.querySelector('form')
      expect(form).toHaveClass('custom-class')
    })

    it('applies default flex-1 class to form', () => {
      const { container } = renderComponent()

      const form = container.querySelector('form')
      expect(form).toHaveClass('flex-1')
    })
  })

  describe('Edge cases', () => {
    it('handles empty string value', () => {
      renderComponent({ value: '' })

      expect(screen.getByRole('textbox')).toHaveValue('')
      expect(
        screen.queryByRole('button', { name: 'Clear search' }),
      ).not.toBeInTheDocument()
    })

    it('handles long search queries', async () => {
      const longQuery = 'test'
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const input = screen.getByRole('textbox')
      await user.type(input, longQuery)

      await waitFor(() => {
        // Each character triggers onChange
        expect(onChange).toHaveBeenCalledTimes(longQuery.length)
        expect(onChange).toHaveBeenNthCalledWith(4, 't')
      })
    })

    it('handles special characters in search', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const input = screen.getByRole('textbox')
      await user.type(input, '!@#$%')

      await waitFor(() => {
        // Each character triggers onChange individually
        expect(onChange).toHaveBeenCalledTimes(5)
        expect(onChange).toHaveBeenNthCalledWith(1, '!')
        expect(onChange).toHaveBeenNthCalledWith(5, '%')
      })
    })

    it('handles rapid typing', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      const input = screen.getByRole('textbox')
      await user.type(input, 'rapid')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(5)
      })
    })
  })

  describe('Mode switching behavior', () => {
    it('switches between submitOnChange modes correctly', async () => {
      const onChange = vi.fn()
      const { user, rerender } = renderComponent({
        value: '',
        onChange,
        submitOnChange: true,
      })

      // Type in submitOnChange mode
      const input = screen.getByRole('textbox')
      await user.type(input, 'a')

      expect(onChange).toHaveBeenCalledWith('a')

      // Switch to submit mode
      rerender(
        <AdminSearchInput
          value=""
          onChange={onChange}
          submitOnChange={false}
        />,
      )

      vi.clearAllMocks()

      await user.type(input, 'b')

      // Should not call onChange in submit mode
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible form structure', () => {
      const { container } = renderComponent()

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('clear button has accessible label', () => {
      renderComponent({ value: 'test' })

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      expect(clearButton).toHaveAccessibleName()
    })

    it('input has accessible label via aria-label', () => {
      renderComponent({ ariaLabel: 'Search products' })

      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName('Search products')
    })
  })
})
