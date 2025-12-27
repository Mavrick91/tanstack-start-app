import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { VariantSelector } from './VariantSelector'

import type { ProductOption, ProductVariant } from '../../types/store'

describe('VariantSelector', () => {
  const mockOnVariantChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createOptions = (): ProductOption[] => [
    { name: 'Shape', values: ['Coffin', 'Almond'] },
    { name: 'Length', values: ['Short', 'Long'] },
  ]

  const createVariants = (): ProductVariant[] => [
    {
      id: 'v1',
      title: 'Coffin / Short',
      price: 25,
      available: true,
      selectedOptions: [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Short' },
      ],
    },
    {
      id: 'v2',
      title: 'Coffin / Long',
      price: 30,
      available: true,
      selectedOptions: [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Long' },
      ],
    },
    {
      id: 'v3',
      title: 'Almond / Short',
      price: 25,
      available: true,
      selectedOptions: [
        { name: 'Shape', value: 'Almond' },
        { name: 'Length', value: 'Short' },
      ],
    },
    {
      id: 'v4',
      title: 'Almond / Long',
      price: 35,
      available: false, // Unavailable variant
      selectedOptions: [
        { name: 'Shape', value: 'Almond' },
        { name: 'Length', value: 'Long' },
      ],
    },
  ]

  describe('Rendering', () => {
    it('renders nothing when no options', () => {
      const { container } = render(
        <VariantSelector
          options={[]}
          variants={[]}
          onVariantChange={mockOnVariantChange}
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders option labels', () => {
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      expect(screen.getByText('Shape')).toBeInTheDocument()
      expect(screen.getByText('Length')).toBeInTheDocument()
    })

    it('renders all option values as buttons', () => {
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      expect(screen.getByRole('button', { name: 'Coffin' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Almond' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Short' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Long' })).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('initializes with first available variant selected', () => {
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      // First variant is Coffin/Short
      expect(mockOnVariantChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'v1', title: 'Coffin / Short' }),
      )
    })

    it('changes variant when option is clicked', async () => {
      const user = userEvent.setup()
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Long' }))

      // Should now be Coffin/Long
      expect(mockOnVariantChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'v2', title: 'Coffin / Long' }),
      )
    })

    it('changes shape and finds matching variant', async () => {
      const user = userEvent.setup()
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Almond' }))

      // Should now be Almond/Short (keeping Short from initial)
      expect(mockOnVariantChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'v3', title: 'Almond / Short' }),
      )
    })
  })

  describe('Availability', () => {
    it('disables unavailable option combinations', async () => {
      const user = userEvent.setup()
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      // Select Almond
      await user.click(screen.getByRole('button', { name: 'Almond' }))

      // Long should be disabled when Almond is selected (Almond/Long is unavailable)
      const longButton = screen.getByRole('button', { name: 'Long' })
      expect(longButton).toBeDisabled()
    })

    it('enables options when switching to available combination', () => {
      render(
        <VariantSelector
          options={createOptions()}
          variants={createVariants()}
          onVariantChange={mockOnVariantChange}
        />,
      )

      // With Coffin selected (default), Long should be enabled
      const longButton = screen.getByRole('button', { name: 'Long' })
      expect(longButton).not.toBeDisabled()
    })
  })
})
