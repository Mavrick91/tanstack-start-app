import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AutocompleteCombobox } from './autocomplete-combobox'

import { render, screen, waitFor } from '@/test/test-utils'

describe('AutocompleteCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultSuggestions = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof AutocompleteCombobox>> = {},
  ) => {
    const defaultProps: React.ComponentProps<typeof AutocompleteCombobox> = {
      value: '',
      onChange: vi.fn(),
      suggestions: defaultSuggestions,
    }
    return render(<AutocompleteCombobox {...defaultProps} {...props} />)
  }

  describe('Initial rendering', () => {
    it('renders input field', () => {
      renderComponent()

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('displays current value', () => {
      renderComponent({ value: 'test value' })

      expect(screen.getByRole('combobox')).toHaveValue('test value')
    })

    it('shows placeholder when provided', () => {
      renderComponent({ placeholder: 'Search fruits...' })

      expect(
        screen.getByPlaceholderText('Search fruits...'),
      ).toBeInTheDocument()
    })

    it('renders toggle button', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: /toggle suggestions/i }),
      ).toBeInTheDocument()
    })

    it('does not show dropdown initially', () => {
      renderComponent()

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Dropdown opening', () => {
    it('opens dropdown on input focus', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('opens dropdown on toggle button click', async () => {
      const { user } = renderComponent()

      const toggle = screen.getByRole('button', { name: /toggle suggestions/i })
      await user.click(toggle)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('shows all suggestions when opening with empty input', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(5)
      })
    })

    it('toggle button focuses input after click', async () => {
      const { user } = renderComponent()

      const toggle = screen.getByRole('button', { name: /toggle suggestions/i })
      const input = screen.getByRole('combobox')

      await user.click(toggle)

      await waitFor(() => {
        expect(input).toHaveFocus()
      })
    })
  })

  describe('Filtering suggestions', () => {
    it('filters suggestions based on input', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, 'ba')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(1)
        expect(screen.getByText('Banana')).toBeInTheDocument()
      })
    })

    it('filtering is case insensitive', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, 'CHERRY')

      await waitFor(() => {
        expect(screen.getByText('Cherry')).toBeInTheDocument()
      })
    })

    it('shows partial matches', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, 'err')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(2) // Cherry, Elderberry
      })
    })

    it('hides dropdown when no matches', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, 'xyz')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('shows all suggestions when input is cleared', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, 'ba')

      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(1)
      })

      await user.clear(input)
      await user.click(input)

      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(5)
      })
    })
  })

  describe('Selecting suggestions', () => {
    it('selects suggestion on click', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Banana')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Banana'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Banana')
      })
    })

    it('keeps dropdown open after selection with selected item shown', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByText('Cherry'))

      await user.click(screen.getByText('Cherry'))

      // Dropdown stays open with only the selected item visible
      await waitFor(() => {
        const listbox = screen.getByRole('listbox')
        expect(listbox).toBeInTheDocument()
        // Input value should be updated to selected item
        expect(screen.getByRole('combobox')).toHaveValue('Cherry')
      })
    })

    it('focuses input after selection', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.click(input)
      await waitFor(() => screen.getByText('Apple'))

      await user.click(screen.getByText('Apple'))

      await waitFor(() => {
        expect(input).toHaveFocus()
      })
    })

    it('highlights selected option with check icon', async () => {
      const { user } = renderComponent({ value: 'Cherry' })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const cherryOption = screen.getByText('Cherry').parentElement
        expect(cherryOption?.querySelector('.lucide-check')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard navigation', () => {
    it('opens dropdown on ArrowDown', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{Escape}') // Close it first

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('opens dropdown on ArrowUp when closed', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{Escape}')

      await user.keyboard('{ArrowUp}')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('navigates down through options with ArrowDown', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowDown}')

      // Check that highlighted option exists in the dropdown (portal rendered)
      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Apple')
      })

      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Banana')
      })
    })

    it('navigates up through options with ArrowUp', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}') // Move to Banana

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Banana')
      })

      await user.keyboard('{ArrowUp}')

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Apple')
      })
    })

    it('selects highlighted option on Enter', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowDown}') // Highlight Apple
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Apple')
      })
    })

    it('closes dropdown on Escape', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('closes dropdown on Tab', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{Tab}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('does not exceed bounds when navigating down', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      // Navigate to last item
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowDown}')
      }

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Elderberry')
      })
    })

    it('does not go below -1 when navigating up', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowUp}')

      // Should remain at -1 (no highlight)
      const highlighted = document.querySelector('.bg-muted')
      expect(highlighted).not.toBeInTheDocument()
    })
  })

  describe('allowCustom mode', () => {
    it('calls onChange on every keystroke when allowCustom is true', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, allowCustom: true })

      const input = screen.getByRole('combobox')
      await user.type(input, 'ab')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(2)
      })
    })

    it('does not call onChange on keystroke when allowCustom is false', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, allowCustom: false })

      const input = screen.getByRole('combobox')
      await user.type(input, 'ab')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('allows submitting custom value with Enter when allowCustom is true', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, allowCustom: true })

      const input = screen.getByRole('combobox')
      await user.type(input, 'Custom')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Disabled state', () => {
    it('disables input when disabled prop is true', () => {
      renderComponent({ disabled: true })

      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('disables toggle button when disabled', () => {
      renderComponent({ disabled: true })

      expect(
        screen.getByRole('button', { name: /toggle suggestions/i }),
      ).toBeDisabled()
    })

    it('does not open dropdown when clicking disabled input', async () => {
      const { user } = renderComponent({ disabled: true })

      const input = screen.getByRole('combobox')
      await user.click(input)

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('input has combobox role', () => {
      renderComponent()

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('input has aria-expanded attribute', () => {
      renderComponent()

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })

    it('aria-expanded is true when dropdown is open', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.click(input)

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('input has aria-haspopup=listbox', () => {
      renderComponent()

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('input has aria-autocomplete=list', () => {
      renderComponent()

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
    })

    it('dropdown has listbox role', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('options have aria-selected attribute', async () => {
      const { user } = renderComponent({ value: 'Apple' })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const appleOption = screen.getByRole('option', { name: /apple/i })
        expect(appleOption).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('toggle button has accessible label', () => {
      renderComponent()

      const toggle = screen.getByRole('button', { name: /toggle suggestions/i })
      expect(toggle).toHaveAccessibleName()
    })

    it('input has autocomplete off', () => {
      renderComponent()

      expect(screen.getByRole('combobox')).toHaveAttribute(
        'autocomplete',
        'off',
      )
    })
  })

  describe('Styling', () => {
    it('applies custom className to container', () => {
      const { container } = renderComponent({ className: 'custom-class' })

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })

    it('applies custom inputClassName to input', () => {
      renderComponent({ inputClassName: 'input-custom' })

      expect(screen.getByRole('combobox')).toHaveClass('input-custom')
    })

    it('input has padding for toggle button', () => {
      renderComponent()

      expect(screen.getByRole('combobox')).toHaveClass('pr-8')
    })

    it('toggle button rotates chevron when dropdown is open', async () => {
      const { user, container } = renderComponent()

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const chevron = container.querySelector('.lucide-chevron-down')
        expect(chevron).toHaveClass('rotate-180')
      })
    })

    it('highlighted option has background', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty suggestions array', async () => {
      const { user } = renderComponent({ suggestions: [] })

      await user.click(screen.getByRole('combobox'))

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('handles single suggestion', async () => {
      const { user } = renderComponent({ suggestions: ['Only'] })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(1)
      })
    })

    it('handles suggestions with special characters', async () => {
      const { user } = renderComponent({
        suggestions: ['Option (1)', 'Option & More', 'Option "special"'],
      })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Option (1)')).toBeInTheDocument()
      })
    })

    it('syncs input value when external value changes', () => {
      const { rerender } = renderComponent({ value: 'initial' })

      expect(screen.getByRole('combobox')).toHaveValue('initial')

      rerender(
        <AutocompleteCombobox
          value="updated"
          onChange={vi.fn()}
          suggestions={defaultSuggestions}
        />,
      )

      expect(screen.getByRole('combobox')).toHaveValue('updated')
    })

    it('handles whitespace-only input', async () => {
      const { user } = renderComponent()

      const input = screen.getByRole('combobox')
      await user.type(input, '   ')

      await waitFor(() => {
        // Whitespace-only should show all suggestions
        expect(screen.getAllByRole('option')).toHaveLength(5)
      })
    })

    it('handles duplicate suggestions', async () => {
      const { user } = renderComponent({
        suggestions: ['Apple', 'Apple', 'Banana'],
      })

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(3)
      })
    })
  })

  describe('Mouse interactions', () => {
    it('highlights option on mouse enter', async () => {
      const { user } = renderComponent()

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByText('Banana'))

      await user.hover(screen.getByText('Banana'))

      await waitFor(() => {
        const highlighted = document.querySelector('.bg-muted')
        expect(highlighted).toHaveTextContent('Banana')
      })
    })

    it('clicking option while keyboard-highlighted selects it', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange })

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => screen.getByRole('listbox'))

      await user.keyboard('{ArrowDown}') // Highlight Apple
      await user.click(screen.getByText('Apple'))

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Apple')
      })
    })
  })

  describe('Input id', () => {
    it('applies id to input when provided', () => {
      renderComponent({ id: 'fruit-input' })

      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'fruit-input')
    })

    it('works without id', () => {
      renderComponent()

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })
})
