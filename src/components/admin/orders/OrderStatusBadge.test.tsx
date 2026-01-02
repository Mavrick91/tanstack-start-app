import { describe, expect, it } from 'vitest'

import { OrderStatusBadge } from './OrderStatusBadge'

import { render, screen } from '@/test/test-utils'

describe('OrderStatusBadge Component', () => {
  describe('Order Status Rendering', () => {
    it('should render pending status', () => {
      render(<OrderStatusBadge status="pending" type="order" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should render processing status', () => {
      render(<OrderStatusBadge status="processing" type="order" />)
      expect(screen.getByText('Processing')).toBeInTheDocument()
    })

    it('should render shipped status', () => {
      render(<OrderStatusBadge status="shipped" type="order" />)
      expect(screen.getByText('Shipped')).toBeInTheDocument()
    })

    it('should render delivered status', () => {
      render(<OrderStatusBadge status="delivered" type="order" />)
      expect(screen.getByText('Delivered')).toBeInTheDocument()
    })

    it('should render cancelled status', () => {
      render(<OrderStatusBadge status="cancelled" type="order" />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  describe('Payment Status Rendering', () => {
    it('should render pending payment status', () => {
      render(<OrderStatusBadge status="pending" type="payment" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should render paid status', () => {
      render(<OrderStatusBadge status="paid" type="payment" />)
      expect(screen.getByText('Paid')).toBeInTheDocument()
    })

    it('should render failed status', () => {
      render(<OrderStatusBadge status="failed" type="payment" />)
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should render refunded status', () => {
      render(<OrderStatusBadge status="refunded" type="payment" />)
      expect(screen.getByText('Refunded')).toBeInTheDocument()
    })
  })

  describe('Fulfillment Status Rendering', () => {
    it('should render unfulfilled status', () => {
      render(<OrderStatusBadge status="unfulfilled" type="fulfillment" />)
      expect(screen.getByText('Unfulfilled')).toBeInTheDocument()
    })

    it('should render partial status', () => {
      render(<OrderStatusBadge status="partial" type="fulfillment" />)
      expect(screen.getByText('Partial')).toBeInTheDocument()
    })

    it('should render fulfilled status', () => {
      render(<OrderStatusBadge status="fulfilled" type="fulfillment" />)
      expect(screen.getByText('Fulfilled')).toBeInTheDocument()
    })
  })

  describe('Unknown Status Handling', () => {
    it('should handle unknown status gracefully', () => {
      const { container } = render(
        <OrderStatusBadge
          status={'unknown' as unknown as 'pending'}
          type="order"
        />,
      )
      const badge = container.firstChild as HTMLElement

      // Should still render with fallback styling
      expect(badge).toBeInTheDocument()
      expect(screen.getByText('unknown')).toBeInTheDocument()
      expect(badge).toHaveClass('bg-gray-100')
    })
  })

  describe('Default Type', () => {
    it('should default to order type', () => {
      render(<OrderStatusBadge status="pending" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })
})
