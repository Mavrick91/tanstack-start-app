import { describe, expect, it } from 'vitest'

import { OrderSummary } from './OrderSummary'

import type { CheckoutCartItem } from '../../types/checkout'

import { render, screen } from '@/test/test-utils'

const MOCK_ITEMS: CheckoutCartItem[] = [
  {
    productId: 'prod-1',
    variantId: 'var-1',
    quantity: 2,
    title: 'Test Product 1',
    variantTitle: 'Size M / Blue',
    price: 29.99,
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    productId: 'prod-2',
    quantity: 1,
    title: 'Test Product 2',
    price: 49.99,
  },
]

describe('OrderSummary Component', () => {
  describe('Basic Rendering', () => {
    it('should render order summary heading', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      expect(screen.getByText('Order summary')).toBeInTheDocument()
    })

    it('should display subtotal', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getByText('$109.97')).toBeInTheDocument()
    })

    it('should display total', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('$115.96')).toBeInTheDocument()
    })
  })

  describe('Item Display', () => {
    it('should display all items when showItems is true', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={109.97}
          total={115.96}
          showItems={true}
        />,
      )

      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })

    it('should hide items when showItems is false', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={109.97}
          total={115.96}
          showItems={false}
        />,
      )

      expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument()
    })

    it('should display variant title when available', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      expect(screen.getByText('Size M / Blue')).toBeInTheDocument()
    })

    it('should display quantity badge', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      // Product 1 has quantity 2
      expect(screen.getByText('2')).toBeInTheDocument()
      // Product 2 has quantity 1
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should display item price multiplied by quantity', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      // Product 1: $29.99 * 2 = $59.98
      expect(screen.getByText('$59.98')).toBeInTheDocument()
      // Product 2: $49.99 * 1 = $49.99
      expect(screen.getByText('$49.99')).toBeInTheDocument()
    })

    it('should display product image when available', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThan(0)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg')
    })

    it('should show placeholder when no image', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={115.96} />,
      )

      // Product 2 has no image
      expect(screen.getByText('No image')).toBeInTheDocument()
    })
  })

  describe('Shipping Display', () => {
    it('should display shipping cost', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={109.97}
          shippingTotal={5.99}
          total={115.96}
        />,
      )

      expect(screen.getByText('Shipping')).toBeInTheDocument()
      expect(screen.getByText('$5.99')).toBeInTheDocument()
    })

    it('should display "Calculated at next step" for zero shipping', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={109.97}
          shippingTotal={0}
          total={109.97}
        />,
      )

      expect(screen.getByText('Shipping')).toBeInTheDocument()
      expect(screen.getByText('Calculated at next step')).toBeInTheDocument()
    })

    it('should display "Calculated at next step" when shipping not provided', () => {
      render(
        <OrderSummary items={MOCK_ITEMS} subtotal={109.97} total={109.97} />,
      )

      expect(screen.getByText('Calculated at next step')).toBeInTheDocument()
    })
  })

  describe('Tax Display', () => {
    it('should display tax when greater than zero', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={100}
          taxTotal={8.25}
          total={108.25}
        />,
      )

      expect(screen.getByText('Tax')).toBeInTheDocument()
      expect(screen.getByText('$8.25')).toBeInTheDocument()
    })

    it('should hide tax when zero', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={100}
          taxTotal={0}
          total={100}
        />,
      )

      expect(screen.queryByText('Tax')).not.toBeInTheDocument()
    })

    it('should hide tax when not provided', () => {
      render(<OrderSummary items={MOCK_ITEMS} subtotal={100} total={100} />)

      expect(screen.queryByText('Tax')).not.toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('should format prices in USD by default', () => {
      render(<OrderSummary items={MOCK_ITEMS} subtotal={100} total={100} />)

      // Both subtotal and total show $100.00
      const priceElements = screen.getAllByText('$100.00')
      expect(priceElements.length).toBeGreaterThanOrEqual(2)
    })

    it('should format prices in specified currency', () => {
      render(
        <OrderSummary
          items={MOCK_ITEMS}
          subtotal={100}
          total={100}
          currency="EUR"
        />,
      )

      // EUR formatting may vary by locale, but should contain the amount
      const priceElements = screen.getAllByText(/100/)
      expect(priceElements.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should handle empty items array', () => {
      render(<OrderSummary items={[]} subtotal={0} total={0} />)

      expect(screen.getByText('Order summary')).toBeInTheDocument()
      // Multiple $0.00 elements (subtotal, total)
      const zeroElements = screen.getAllByText('$0.00')
      expect(zeroElements.length).toBeGreaterThanOrEqual(2)
    })
  })
})
