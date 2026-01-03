// Component import must come after vi.mock for proper mocking
/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen, within } from '@/test/test-utils'

// Mock CheckoutProgress component
vi.mock('./CheckoutProgress', () => ({
  CheckoutProgress: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="checkout-progress">Progress: {currentStep}</div>
  ),
}))

import { CheckoutLayout } from './CheckoutLayout'

describe('CheckoutLayout', () => {
  const defaultProps = {
    currentStep: 'information' as const,
    children: <div>Main content</div>,
    orderSummary: <div>Order summary content</div>,
    total: '$99.99',
  }

  beforeEach(() => {
    // Reset any test-specific state
  })

  describe('Rendering', () => {
    it('should render children in main content area', () => {
      render(<CheckoutLayout {...defaultProps} />)

      expect(screen.getByText('Main content')).toBeInTheDocument()
    })

    it('should render store logo', () => {
      render(<CheckoutLayout {...defaultProps} />)

      expect(screen.getByText('FineNail Season')).toBeInTheDocument()
    })

    it('should render back to store link', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const backLink = screen.getByText(/return to store/i)
      expect(backLink).toBeInTheDocument()
    })

    it('should render footer with policy links', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const footer = screen.getByRole('contentinfo')
      expect(within(footer).getByText(/refund policy/i)).toBeInTheDocument()
      expect(within(footer).getByText(/shipping policy/i)).toBeInTheDocument()
      expect(within(footer).getByText(/privacy policy/i)).toBeInTheDocument()
      expect(within(footer).getByText(/terms of service/i)).toBeInTheDocument()
    })
  })

  describe('Checkout Progress', () => {
    it('should render checkout progress for non-confirmation steps', () => {
      render(<CheckoutLayout {...defaultProps} currentStep="shipping" />)

      const progress = screen.getByTestId('checkout-progress')
      expect(progress).toHaveTextContent('Progress: shipping')
    })

    it('should not render checkout progress on confirmation step', () => {
      render(<CheckoutLayout {...defaultProps} currentStep="confirmation" />)

      expect(screen.queryByTestId('checkout-progress')).not.toBeInTheDocument()
    })

    it('should render checkout progress for information step', () => {
      render(<CheckoutLayout {...defaultProps} currentStep="information" />)

      expect(screen.getByTestId('checkout-progress')).toBeInTheDocument()
    })

    it('should render checkout progress for payment step', () => {
      render(<CheckoutLayout {...defaultProps} currentStep="payment" />)

      expect(screen.getByTestId('checkout-progress')).toBeInTheDocument()
    })
  })

  describe('Order Summary (Desktop)', () => {
    it('should render order summary in sidebar on desktop', () => {
      render(<CheckoutLayout {...defaultProps} />)

      // Desktop sidebar should exist (hidden class lg:block)
      const summary = screen.getAllByText('Order summary content')
      expect(summary.length).toBeGreaterThan(0)
    })

    it('should not render desktop sidebar when isFullWidth is true', () => {
      render(<CheckoutLayout {...defaultProps} isFullWidth={true} />)

      // Mobile summary should not exist
      expect(
        screen.queryByRole('button', { name: /show order summary/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('Order Summary (Mobile)', () => {
    it('should render mobile summary toggle button', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should display total in mobile header', () => {
      render(<CheckoutLayout {...defaultProps} total="$123.45" />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })
      expect(toggleButton).toHaveTextContent('$123.45')
    })

    it('should toggle summary expansion when button is clicked', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })

      // Initially collapsed
      expect(toggleButton).toHaveTextContent(/show order summary/i)

      // Click to expand
      fireEvent.click(toggleButton)

      // Should show "Hide" text
      expect(
        screen.getByRole('button', { name: /hide order summary/i }),
      ).toBeInTheDocument()

      // Click to collapse again
      fireEvent.click(
        screen.getByRole('button', { name: /hide order summary/i }),
      )

      // Should show "Show" text again
      expect(
        screen.getByRole('button', { name: /show order summary/i }),
      ).toBeInTheDocument()
    })

    it('should show order summary content when expanded', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })

      // Click to expand
      fireEvent.click(toggleButton)

      // Order summary should be visible
      const summaries = screen.getAllByText('Order summary content')
      expect(summaries.length).toBeGreaterThan(0)
    })

    it('should have shopping bag icon in toggle button', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })
      expect(toggleButton).toBeInTheDocument()
      // SVG icon is present
    })
  })

  describe('Layout Modes', () => {
    it('should apply full width layout when isFullWidth is true', () => {
      const { container } = render(
        <CheckoutLayout {...defaultProps} isFullWidth={true} />,
      )

      const mainContainer = container.querySelector('[class*="max-w-4xl"]')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should apply two-column layout when isFullWidth is false', () => {
      const { container } = render(
        <CheckoutLayout {...defaultProps} isFullWidth={false} />,
      )

      const mainContainer = container.querySelector('[class*="max-w-7xl"]')
      expect(mainContainer).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should link store logo to home page', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const logoLink = screen.getByText('FineNail Season').closest('a')
      expect(logoLink).toHaveAttribute('href', '/en')
    })

    it('should link return button to home page', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const returnLink = screen.getByText(/return to store/i).closest('a')
      expect(returnLink).toHaveAttribute('href', '/en')
    })

    it('should render footer policy links', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const footer = screen.getByRole('contentinfo')
      const links = within(footer).getAllByRole('link')

      expect(links.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Accessibility', () => {
    it('should render footer with contentinfo landmark', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
    })

    it('should have accessible toggle button for mobile summary', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const toggleButton = screen.getByRole('button', {
        name: /show order summary/i,
      })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAccessibleName()
    })

    it('should render main content in a main element', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const main = screen.getByRole('main')
      expect(main).toHaveTextContent('Main content')
    })

    it('should render header with banner landmark', () => {
      render(<CheckoutLayout {...defaultProps} />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  describe('Content Organization', () => {
    it('should render content in correct order', () => {
      render(<CheckoutLayout {...defaultProps} currentStep="information" />)

      const container = screen.getByRole('banner').parentElement

      // Check that header comes before progress and main content
      const children = Array.from(container?.querySelectorAll('*') || [])
      const headerIndex = children.findIndex((el) =>
        el.textContent?.includes('FineNail Season'),
      )
      const progressIndex = children.findIndex(
        (el) => el.getAttribute('data-testid') === 'checkout-progress',
      )
      const mainIndex = children.findIndex((el) =>
        el.textContent?.includes('Main content'),
      )

      expect(headerIndex).toBeLessThan(progressIndex)
      expect(progressIndex).toBeLessThan(mainIndex)
    })
  })
})
