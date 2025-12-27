import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProductOptions, type ProductOption } from './ProductOptions'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('ProductOptions', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Empty State', () => {
    it('renders empty state with preset and custom option buttons', () => {
      render(<ProductOptions options={[]} onChange={mockOnChange} />)

      expect(
        screen.getByText(
          'Add options like Shape, Length, or Size to create variants',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Use Nail Presets/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Add Custom Option/i }),
      ).toBeInTheDocument()
    })

    it('applies nail presets when Use Nail Presets clicked', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={[]} onChange={mockOnChange} />)

      await user.click(
        screen.getByRole('button', { name: /Use Nail Presets/i }),
      )

      expect(mockOnChange).toHaveBeenCalledWith([
        {
          name: 'Shape',
          values: ['Coffin', 'Almond', 'Oval', 'Square', 'Stiletto'],
        },
        { name: 'Length', values: ['Short', 'Medium', 'Long', 'XL'] },
      ])
    })

    it('calls onChange with new empty option when Add Custom Option clicked', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={[]} onChange={mockOnChange} />)

      await user.click(
        screen.getByRole('button', { name: /Add Custom Option/i }),
      )

      expect(mockOnChange).toHaveBeenCalledWith([{ name: '', values: [] }])
    })

    it('disables buttons when disabled prop is true', () => {
      render(<ProductOptions options={[]} onChange={mockOnChange} disabled />)

      expect(
        screen.getByRole('button', { name: /Use Nail Presets/i }),
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: /Add Custom Option/i }),
      ).toBeDisabled()
    })
  })

  describe('With Options', () => {
    const existingOptions: ProductOption[] = [
      { name: 'Shape', values: ['Coffin', 'Almond'] },
      { name: 'Length', values: ['Short', 'Medium', 'Long'] },
    ]

    it('renders all options with their names and values', () => {
      render(
        <ProductOptions options={existingOptions} onChange={mockOnChange} />,
      )

      // The inputs are: option1-name, option1-value-input, option2-name, option2-value-input
      // So option names are at indices 0 and 2
      const inputs = screen.getAllByRole('textbox')
      expect(inputs[0]).toHaveValue('Shape')
      expect(inputs[2]).toHaveValue('Length')

      // Values should be visible as badges
      expect(screen.getByText('Coffin')).toBeInTheDocument()
      expect(screen.getByText('Almond')).toBeInTheDocument()
      expect(screen.getByText('Short')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Long')).toBeInTheDocument()
    })

    it('updates option name when input changes', async () => {
      const user = userEvent.setup()
      render(
        <ProductOptions options={existingOptions} onChange={mockOnChange} />,
      )

      const inputs = screen.getAllByRole('textbox')
      // Just type an additional character to trigger onChange
      await user.type(inputs[0], 'X')

      // Check that onChange was called with updated name (Shape + X = ShapeX)
      const lastCall =
        mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]
      expect(lastCall[0][0].name).toBe('ShapeX')
    })

    it('removes option when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProductOptions options={existingOptions} onChange={mockOnChange} />,
      )

      // Use data-testid for reliable selection
      const deleteButton = screen.getByTestId('delete-option-0')
      await user.click(deleteButton)

      // Should call onChange with first option removed
      expect(mockOnChange).toHaveBeenCalledWith([
        { name: 'Length', values: ['Short', 'Medium', 'Long'] },
      ])
    })

    it('adds another option when Add Another Option is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProductOptions options={existingOptions} onChange={mockOnChange} />,
      )

      await user.click(
        screen.getByRole('button', { name: /Add Another Option/i }),
      )

      expect(mockOnChange).toHaveBeenCalledWith([
        ...existingOptions,
        { name: '', values: [] },
      ])
    })
  })

  describe('Option Values', () => {
    const singleOption: ProductOption[] = [
      { name: 'Shape', values: ['Coffin'] },
    ]

    it('adds value when Enter is pressed in value input', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={singleOption} onChange={mockOnChange} />)

      const valueInput = screen.getByPlaceholderText(
        'Add value and press Enter',
      )
      await user.type(valueInput, 'Almond{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith([
        { name: 'Shape', values: ['Coffin', 'Almond'] },
      ])
    })

    it('adds value when plus button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={singleOption} onChange={mockOnChange} />)

      const valueInput = screen.getByPlaceholderText(
        'Add value and press Enter',
      )
      await user.type(valueInput, 'Stiletto')

      // Use data-testid for reliable selection
      const addValueButton = screen.getByTestId('add-value-0')
      await user.click(addValueButton)

      const lastCall =
        mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]
      expect(lastCall[0][0].values).toContain('Stiletto')
    })

    it('does not add duplicate values', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={singleOption} onChange={mockOnChange} />)

      const valueInput = screen.getByPlaceholderText(
        'Add value and press Enter',
      )
      await user.type(valueInput, 'Coffin{Enter}')

      // Should not have called onChange because Coffin already exists
      const calls = mockOnChange.mock.calls.filter(
        (call) => call[0][0].values.length > 1,
      )
      expect(calls.length).toBe(0)
    })

    it('does not add empty values', async () => {
      const user = userEvent.setup()
      render(<ProductOptions options={singleOption} onChange={mockOnChange} />)

      const valueInput = screen.getByPlaceholderText(
        'Add value and press Enter',
      )
      await user.type(valueInput, '   {Enter}')

      // Should not have called onChange with new value
      const calls = mockOnChange.mock.calls.filter(
        (call) => call[0][0].values.length > 1,
      )
      expect(calls.length).toBe(0)
    })

    it('removes value when × button is clicked', async () => {
      const user = userEvent.setup()
      const optionWithValues: ProductOption[] = [
        { name: 'Shape', values: ['Coffin', 'Almond', 'Stiletto'] },
      ]
      render(
        <ProductOptions options={optionWithValues} onChange={mockOnChange} />,
      )

      // Use data-testid for reliable selection (remove Almond which is index 1)
      const removeButton = screen.getByTestId('remove-value-0-1')
      await user.click(removeButton)

      expect(mockOnChange).toHaveBeenCalledWith([
        { name: 'Shape', values: ['Coffin', 'Stiletto'] },
      ])
    })
  })

  describe('Disabled State', () => {
    const options: ProductOption[] = [{ name: 'Shape', values: ['Coffin'] }]

    it('disables all inputs and buttons when disabled', () => {
      render(
        <ProductOptions options={options} onChange={mockOnChange} disabled />,
      )

      // Name input should be disabled
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toBeDisabled()
      })

      // All buttons should be disabled
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })
  })
})
