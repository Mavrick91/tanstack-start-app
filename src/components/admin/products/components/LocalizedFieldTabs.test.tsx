import { describe, expect, it, vi } from 'vitest'

import { LocalizedFieldTabs, type LocalizedString } from './LocalizedFieldTabs'

import { render, screen } from '@/test/test-utils'

// Mock RichTextEditor since it's complex
vi.mock('../../../ui/rich-text-editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (val: string) => void
    placeholder: string
  }) => (
    <div data-testid="rich-text-editor">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="rich text editor"
      />
    </div>
  ),
}))

const renderComponent = (
  props: Partial<React.ComponentProps<typeof LocalizedFieldTabs>> = {},
) => {
  const defaultValue: LocalizedString = {
    en: '',
    fr: '',
    id: '',
  }

  const defaultProps: React.ComponentProps<typeof LocalizedFieldTabs> = {
    value: defaultValue,
    onChange: vi.fn(),
    type: 'input',
  }

  return render(<LocalizedFieldTabs {...defaultProps} {...props} />)
}

describe('LocalizedFieldTabs', () => {
  describe('Rendering', () => {
    it('renders all language tabs', () => {
      renderComponent()

      expect(screen.getByRole('tab', { name: /en/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /fr/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /id/i })).toBeInTheDocument()
    })

    it('shows English tab as active by default', () => {
      renderComponent()

      const enTab = screen.getByRole('tab', { name: /en/i })
      expect(enTab).toHaveAttribute('data-state', 'active')
    })

    it('renders input field by default', () => {
      renderComponent()

      const inputs = screen.getAllByRole('textbox')
      // Only the active tab's input should be visible
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('renders textarea when type is textarea', () => {
      renderComponent({ type: 'textarea' })

      const textareas = screen.getAllByRole('textbox')
      expect(textareas.length).toBeGreaterThan(0)
    })

    it('renders rich text editor when type is richtext', () => {
      renderComponent({ type: 'richtext' })

      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
    })
  })

  describe('Language switching', () => {
    it('switches to French tab when clicked', async () => {
      const { user } = renderComponent()

      const frTab = screen.getByRole('tab', { name: /fr/i })
      await user.click(frTab)

      expect(frTab).toHaveAttribute('data-state', 'active')
    })

    it('switches to Indonesian tab when clicked', async () => {
      const { user } = renderComponent()

      const idTab = screen.getByRole('tab', { name: /id/i })
      await user.click(idTab)

      expect(idTab).toHaveAttribute('data-state', 'active')
    })

    it('shows different content for each language tab', async () => {
      const value: LocalizedString = {
        en: 'English text',
        fr: 'French text',
        id: 'Indonesian text',
      }
      const { user } = renderComponent({ value })

      // English tab is active by default
      expect(screen.getByDisplayValue('English text')).toBeInTheDocument()

      // Switch to French
      await user.click(screen.getByRole('tab', { name: /fr/i }))
      expect(screen.getByDisplayValue('French text')).toBeInTheDocument()

      // Switch to Indonesian
      await user.click(screen.getByRole('tab', { name: /id/i }))
      expect(screen.getByDisplayValue('Indonesian text')).toBeInTheDocument()
    })
  })

  describe('Input type field', () => {
    it('displays placeholder for English input', () => {
      renderComponent({
        type: 'input',
        placeholder: { en: 'Enter English text' },
      })

      expect(
        screen.getByPlaceholderText('Enter English text'),
      ).toBeInTheDocument()
    })

    it('calls onChange when typing in English input', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, type: 'input' })

      const input = screen.getAllByRole('textbox')[0]
      await user.type(input, 'a')

      expect(onChange).toHaveBeenCalled()
      // Check that onChange was called with English value updated
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.en).toBeDefined()
    })

    it('calls onChange when typing in French input', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, type: 'input' })

      // Switch to French tab
      await user.click(screen.getByRole('tab', { name: /fr/i }))

      const input = screen.getAllByRole('textbox')[0]
      await user.type(input, 'f')

      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.fr).toBeDefined()
    })

    it('calls onChange when typing in Indonesian input', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, type: 'input' })

      // Switch to Indonesian tab
      await user.click(screen.getByRole('tab', { name: /id/i }))

      const input = screen.getAllByRole('textbox')[0]
      await user.type(input, 'i')

      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.id).toBeDefined()
    })

    it('calls onBlurEn when English input loses focus', async () => {
      const onBlurEn = vi.fn()
      const { user } = renderComponent({ onBlurEn, type: 'input' })

      const input = screen.getAllByRole('textbox')[0]
      await user.click(input)
      await user.tab() // Move focus away

      expect(onBlurEn).toHaveBeenCalledOnce()
    })

    it('does not call onBlurEn for French or Indonesian inputs', async () => {
      const onBlurEn = vi.fn()
      const { user } = renderComponent({ onBlurEn, type: 'input' })

      // Switch to French
      await user.click(screen.getByRole('tab', { name: /fr/i }))
      const frInput = screen.getAllByRole('textbox')[0]
      await user.click(frInput)
      await user.tab()

      expect(onBlurEn).not.toHaveBeenCalled()
    })
  })

  describe('Textarea type field', () => {
    it('renders textarea with 3 rows', () => {
      const { container } = renderComponent({ type: 'textarea' })

      const textarea = container.querySelector('textarea')
      expect(textarea).toHaveAttribute('rows', '3')
    })

    it('displays placeholder for textarea', () => {
      renderComponent({
        type: 'textarea',
        placeholder: { en: 'Enter description' },
      })

      expect(
        screen.getByPlaceholderText('Enter description'),
      ).toBeInTheDocument()
    })

    it('calls onChange when typing in textarea', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, type: 'textarea' })

      const textarea = screen.getAllByRole('textbox')[0]
      await user.clear(textarea)
      await user.type(textarea, 'Multi\nline\ntext')

      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('Rich text type field', () => {
    it('renders rich text editor', () => {
      renderComponent({ type: 'richtext' })

      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()
    })

    it('displays placeholder for rich text editor', () => {
      renderComponent({
        type: 'richtext',
        placeholder: { en: 'Enter rich text' },
      })

      expect(screen.getByPlaceholderText('Enter rich text')).toBeInTheDocument()
    })

    it('calls onChange when typing in rich text editor', async () => {
      const onChange = vi.fn()
      const { user } = renderComponent({ onChange, type: 'richtext' })

      const editor = screen.getByLabelText('rich text editor')
      await user.clear(editor)
      await user.type(editor, 'Rich content')

      expect(onChange).toHaveBeenCalled()
    })

    it('shows different rich text content for each language', async () => {
      const value: LocalizedString = {
        en: 'English rich text',
        fr: 'French rich text',
        id: 'Indonesian rich text',
      }
      const { user } = renderComponent({ value, type: 'richtext' })

      expect(screen.getByDisplayValue('English rich text')).toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: /fr/i }))
      expect(screen.getByDisplayValue('French rich text')).toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: /id/i }))
      expect(
        screen.getByDisplayValue('Indonesian rich text'),
      ).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('shows error styling on English input when hasError is true', () => {
      const { container } = renderComponent({ hasError: true, type: 'input' })

      const input = container.querySelector('input')
      expect(input).toHaveClass('border-destructive')
    })

    it('does not show error styling on French input when hasError is true', async () => {
      const { container, user } = renderComponent({
        hasError: true,
        type: 'input',
      })

      await user.click(screen.getByRole('tab', { name: /fr/i }))

      const input = container.querySelector('input')
      expect(input).not.toHaveClass('border-destructive')
    })

    it('does not show error styling on Indonesian input when hasError is true', async () => {
      const { container, user } = renderComponent({
        hasError: true,
        type: 'input',
      })

      await user.click(screen.getByRole('tab', { name: /id/i }))

      const input = container.querySelector('input')
      expect(input).not.toHaveClass('border-destructive')
    })

    it('shows error styling on English textarea when hasError is true', () => {
      const { container } = renderComponent({
        hasError: true,
        type: 'textarea',
      })

      const textarea = container.querySelector('textarea')
      expect(textarea).toHaveClass('border-destructive')
    })
  })

  describe('Custom className', () => {
    it('applies custom className to input', () => {
      const { container } = renderComponent({
        type: 'input',
        className: 'custom-class',
      })

      const input = container.querySelector('input')
      expect(input).toHaveClass('custom-class')
    })

    it('applies custom className to textarea', () => {
      const { container } = renderComponent({
        type: 'textarea',
        className: 'custom-class',
      })

      const textarea = container.querySelector('textarea')
      expect(textarea).toHaveClass('custom-class')
    })
  })

  describe('Edge cases', () => {
    it('handles undefined values for optional languages', async () => {
      const value: LocalizedString = {
        en: 'English only',
      }
      const { user } = renderComponent({ value })

      // Switch to French (undefined)
      await user.click(screen.getByRole('tab', { name: /fr/i }))
      const frInput = screen.getAllByRole('textbox')[0]
      expect(frInput).toHaveValue('')

      // Switch to Indonesian (undefined)
      await user.click(screen.getByRole('tab', { name: /id/i }))
      const idInput = screen.getAllByRole('textbox')[0]
      expect(idInput).toHaveValue('')
    })

    it('preserves existing values when updating one language', async () => {
      const onChange = vi.fn()
      const value: LocalizedString = {
        en: 'English',
        fr: 'Français',
        id: 'Indonesia',
      }
      const { user } = renderComponent({ value, onChange })

      // Update English
      const enInput = screen.getAllByRole('textbox')[0]
      await user.clear(enInput)
      await user.type(enInput, 'Updated English')

      // Check that French and Indonesian are preserved
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.fr).toBe('Français')
      expect(lastCall.id).toBe('Indonesia')
    })

    it('handles empty placeholders gracefully', () => {
      renderComponent({ placeholder: {} })

      // Should render without errors
      expect(screen.getByRole('tab', { name: /en/i })).toBeInTheDocument()
    })
  })
})
