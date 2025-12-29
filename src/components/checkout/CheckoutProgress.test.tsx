import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CheckoutProgress } from './CheckoutProgress'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('CheckoutProgress Component', () => {
  describe('Step Rendering', () => {
    it('should render all three steps', () => {
      render(<CheckoutProgress currentStep="information" />)

      expect(screen.getByText('Information')).toBeInTheDocument()
      expect(screen.getByText('Shipping')).toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    it('should render separators between steps', () => {
      const { container } = render(
        <CheckoutProgress currentStep="information" />,
      )

      // ChevronRight icons between steps
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBe(2) // 2 separators between 3 steps
    })
  })

  describe('Current Step Styling', () => {
    it('should highlight current step with dark text', () => {
      render(<CheckoutProgress currentStep="information" />)

      const informationStep = screen.getByText('Information')
      expect(informationStep).toHaveClass('text-gray-900')
      expect(informationStep).toHaveClass('font-medium')
    })

    it('should style upcoming steps as gray', () => {
      render(<CheckoutProgress currentStep="information" />)

      const shippingStep = screen.getByText('Shipping')
      const paymentStep = screen.getByText('Payment')

      expect(shippingStep).toHaveClass('text-gray-400')
      expect(paymentStep).toHaveClass('text-gray-400')
    })
  })

  describe('Completed Steps', () => {
    it('should style completed steps with blue', () => {
      render(<CheckoutProgress currentStep="shipping" />)

      const informationStep = screen.getByText('Information')
      expect(informationStep).toHaveClass('text-blue-600')
    })

    it('should show current step as dark when in middle', () => {
      render(<CheckoutProgress currentStep="shipping" />)

      const shippingStep = screen.getByText('Shipping')
      expect(shippingStep).toHaveClass('text-gray-900')
    })
  })

  describe('All Steps Styling', () => {
    it('should style correctly for payment step', () => {
      render(<CheckoutProgress currentStep="payment" />)

      const informationStep = screen.getByText('Information')
      const shippingStep = screen.getByText('Shipping')
      const paymentStep = screen.getByText('Payment')

      // Completed steps are blue
      expect(informationStep).toHaveClass('text-blue-600')
      expect(shippingStep).toHaveClass('text-blue-600')
      // Current step is dark
      expect(paymentStep).toHaveClass('text-gray-900')
    })
  })

  describe('Accessibility', () => {
    it('should have navigation landmark', () => {
      render(<CheckoutProgress currentStep="information" />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveAttribute('aria-label', 'Checkout progress')
    })

    it('should use ordered list for steps', () => {
      render(<CheckoutProgress currentStep="information" />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
    })
  })
})
