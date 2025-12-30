import { describe, it, expect, vi } from 'vitest'

import {
  ProductVariantsTable,
  type ProductVariant,
} from './ProductVariantsTable'

import { render, screen } from '@/test/test-utils'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('ProductVariantsTable', () => {
  const mockOnChange = vi.fn()

  describe('Empty State', () => {
    it('renders empty state message when no variants', () => {
      render(<ProductVariantsTable variants={[]} onChange={mockOnChange} />)

      expect(
        screen.getByText('Add options above to generate variants'),
      ).toBeInTheDocument()
    })
  })

  describe('With Variants', () => {
    const variants: ProductVariant[] = [
      {
        id: '1',
        title: 'Coffin / Short',
        selectedOptions: [
          { name: 'Shape', value: 'Coffin' },
          { name: 'Length', value: 'Short' },
        ],
        price: '29.99',
        available: true,
      },
      {
        id: '2',
        title: 'Almond / Long',
        selectedOptions: [
          { name: 'Shape', value: 'Almond' },
          { name: 'Length', value: 'Long' },
        ],
        price: '34.99',
        sku: 'ALM-LONG-001',
        available: true,
      },
    ]

    it('renders all variants with titles and prices', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      expect(screen.getByText('Coffin / Short')).toBeInTheDocument()
      expect(screen.getByText('Almond / Long')).toBeInTheDocument()
      expect(screen.getByText('$29.99')).toBeInTheDocument()
      expect(screen.getByText('$34.99')).toBeInTheDocument()
    })

    it('displays SKU when present', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      expect(screen.getByText('ALM-LONG-001')).toBeInTheDocument()
      // First variant has no SKU, should show dash
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders availability toggle for each variant', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      // Should have 2 switch elements (one per variant)
      const switches = screen.getAllByRole('switch')
      expect(switches.length).toBe(2)
      // Both should be checked (available = true)
      expect(switches[0]).toBeChecked()
      expect(switches[1]).toBeChecked()
    })

    it('toggles availability when switch is clicked', async () => {
      const { user } = render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      const switches = screen.getAllByRole('switch')
      await user.click(switches[0])

      expect(mockOnChange).toHaveBeenCalledWith([
        { ...variants[0], available: false },
        variants[1],
      ])
    })

    it('shows edit button on hover', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      // Edit buttons should exist
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      expect(editButtons.length).toBe(2)
    })

    it('displays variant count summary', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      expect(screen.getByText(/2.*variants/)).toBeInTheDocument()
    })
  })

  describe('Bulk Actions', () => {
    const variants: ProductVariant[] = [
      { title: 'Small', price: '10.00', available: true, selectedOptions: [] },
      { title: 'Medium', price: '15.00', available: true, selectedOptions: [] },
      { title: 'Large', price: '20.00', available: true, selectedOptions: [] },
    ]

    it('renders bulk price input', () => {
      render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      expect(screen.getByPlaceholderText('Set all prices')).toBeInTheDocument()
    })

    it('applies price to all variants when Enter is pressed', async () => {
      const { user } = render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      const bulkInput = screen.getByPlaceholderText('Set all prices')
      await user.type(bulkInput, '25{Enter}')

      // Check that onChange was called with all prices updated
      const lastCall =
        mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]
      expect(lastCall[0]).toHaveLength(3)
      expect(lastCall[0][0].price).toBe('25')
      expect(lastCall[0][1].price).toBe('25')
      expect(lastCall[0][2].price).toBe('25')
    })
  })

  describe('Inline Editing', () => {
    const variants: ProductVariant[] = [
      {
        id: '1',
        title: 'Default',
        price: '19.99',
        available: true,
        selectedOptions: [],
      },
    ]

    it('enters edit mode when Edit button is clicked', async () => {
      const { user } = render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      await user.click(screen.getByRole('button', { name: /Edit/i }))

      // Should now have input fields for price and SKU
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('saves changes when check button is clicked', async () => {
      const { user } = render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      await user.click(screen.getByRole('button', { name: /Edit/i }))

      // Find SKU input (it has placeholder "SKU")
      const skuInput = screen.getByPlaceholderText('SKU')
      await user.type(skuInput, 'NEW-SKU')

      // Find and click the save button (check icon)
      const saveButton = screen
        .getAllByRole('button')
        .find((btn) => btn.className.includes('emerald'))
      expect(saveButton).toBeTruthy()
      if (saveButton) await user.click(saveButton)

      const lastCall =
        mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]
      expect(lastCall[0][0].sku).toBe('NEW-SKU')
    })

    it('cancels editing when X button is clicked', async () => {
      const { user } = render(
        <ProductVariantsTable variants={variants} onChange={mockOnChange} />,
      )

      await user.click(screen.getByRole('button', { name: /Edit/i }))

      // Find and click the cancel button (X icon)
      const cancelButton = screen
        .getAllByRole('button')
        .find((btn) => btn.className.includes('destructive'))
      expect(cancelButton).toBeTruthy()
      if (cancelButton) await user.click(cancelButton)

      // Should exit edit mode - Edit button should be visible again
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    const variants: ProductVariant[] = [
      {
        title: 'Default',
        price: '10.00',
        available: true,
        selectedOptions: [],
      },
    ]

    it('disables availability toggle when disabled', () => {
      render(
        <ProductVariantsTable
          variants={variants}
          onChange={mockOnChange}
          disabled
        />,
      )

      const switches = screen.getAllByRole('switch')
      expect(switches[0]).toBeDisabled()
    })

    it('disables Edit button when disabled', () => {
      render(
        <ProductVariantsTable
          variants={variants}
          onChange={mockOnChange}
          disabled
        />,
      )

      expect(screen.getByRole('button', { name: /Edit/i })).toBeDisabled()
    })
  })
})
