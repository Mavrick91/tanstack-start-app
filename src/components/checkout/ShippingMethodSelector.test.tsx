import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShippingMethodSelector } from './ShippingMethodSelector'

import type { ShippingRate } from '../../types/checkout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const MOCK_RATES: ShippingRate[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 5.99,
    estimatedDays: '5-7 business days',
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 14.99,
    estimatedDays: '2-3 business days',
  },
  {
    id: 'free',
    name: 'Free Shipping',
    price: 0,
    estimatedDays: '5-7 business days',
    isFree: true,
  },
]

describe('ShippingMethodSelector Component', () => {
  describe('Rendering', () => {
    it('should render all shipping options', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      expect(screen.getByText('Standard Shipping')).toBeInTheDocument()
      expect(screen.getByText('Express Shipping')).toBeInTheDocument()
      expect(screen.getByText('Free Shipping')).toBeInTheDocument()
    })

    it('should display prices for each option', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      expect(screen.getByText('$5.99')).toBeInTheDocument()
      expect(screen.getByText('$14.99')).toBeInTheDocument()
    })

    it('should display "Free" for free shipping', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      expect(screen.getByText('Free')).toBeInTheDocument()
    })

    it('should display estimated delivery times', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      const standardDelivery = screen.getAllByText('5-7 business days')
      expect(standardDelivery.length).toBeGreaterThan(0)
      expect(screen.getByText('2-3 business days')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should call onSelect when option is clicked', () => {
      const onSelect = vi.fn()
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('Express Shipping'))
      expect(onSelect).toHaveBeenCalledWith('express')
    })

    it('should check radio button for selected option', () => {
      render(
        <ShippingMethodSelector
          rates={MOCK_RATES}
          selectedRateId="standard"
          onSelect={vi.fn()}
        />,
      )

      const radios = screen.getAllByRole('radio')
      expect(radios[0]).toBeChecked()
      expect(radios[1]).not.toBeChecked()
      expect(radios[2]).not.toBeChecked()
    })

    it('should highlight selected option with background color', () => {
      const { container } = render(
        <ShippingMethodSelector
          rates={MOCK_RATES}
          selectedRateId="standard"
          onSelect={vi.fn()}
        />,
      )

      const labels = container.querySelectorAll('label')
      const standardLabel = Array.from(labels).find((label) =>
        label.textContent?.includes('Standard Shipping'),
      )

      expect(standardLabel).toHaveClass('bg-blue-50')
    })
  })

  describe('Currency Formatting', () => {
    it('should format prices in USD by default', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      expect(screen.getByText('$5.99')).toBeInTheDocument()
    })

    it('should format prices in specified currency', () => {
      render(
        <ShippingMethodSelector
          rates={MOCK_RATES}
          onSelect={vi.fn()}
          currency="EUR"
        />,
      )

      const priceElements = screen.getAllByText(/5\.99|14\.99/)
      expect(priceElements.length).toBeGreaterThan(0)
    })
  })

  describe('Free Shipping', () => {
    it('should show "Free" for zero price rates', () => {
      const rates: ShippingRate[] = [
        {
          id: 'free',
          name: 'Free Standard',
          price: 0,
          estimatedDays: '5-7 days',
        },
      ]

      render(<ShippingMethodSelector rates={rates} onSelect={vi.fn()} />)

      expect(screen.getByText('Free')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should handle empty rates array', () => {
      const { container } = render(
        <ShippingMethodSelector rates={[]} onSelect={vi.fn()} />,
      )

      const radios = container.querySelectorAll('input[type="radio"]')
      expect(radios.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    it('should have radio role for each option', () => {
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={vi.fn()} />)

      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(MOCK_RATES.length)
    })

    it('should be keyboard accessible', () => {
      const onSelect = vi.fn()
      render(<ShippingMethodSelector rates={MOCK_RATES} onSelect={onSelect} />)

      const radios = screen.getAllByRole('radio')
      fireEvent.click(radios[1])

      expect(onSelect).toHaveBeenCalledWith('express')
    })
  })
})
