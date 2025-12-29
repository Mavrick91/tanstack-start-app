import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OrderStatusBadge } from './OrderStatusBadge'

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

  describe('Status Styling', () => {
    it('should apply yellow styling for pending status', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-yellow-500/20')
      expect(badge).toHaveClass('text-yellow-400')
    })

    it('should apply blue styling for processing status', () => {
      const { container } = render(
        <OrderStatusBadge status="processing" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-blue-500/20')
      expect(badge).toHaveClass('text-blue-400')
    })

    it('should apply purple styling for shipped status', () => {
      const { container } = render(
        <OrderStatusBadge status="shipped" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-purple-500/20')
      expect(badge).toHaveClass('text-purple-400')
    })

    it('should apply green styling for delivered status', () => {
      const { container } = render(
        <OrderStatusBadge status="delivered" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500/20')
      expect(badge).toHaveClass('text-green-400')
    })

    it('should apply red styling for cancelled status', () => {
      const { container } = render(
        <OrderStatusBadge status="cancelled" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-red-500/20')
      expect(badge).toHaveClass('text-red-400')
    })

    it('should apply green styling for paid status', () => {
      const { container } = render(
        <OrderStatusBadge status="paid" type="payment" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500/20')
      expect(badge).toHaveClass('text-green-400')
    })

    it('should apply red styling for failed status', () => {
      const { container } = render(
        <OrderStatusBadge status="failed" type="payment" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-red-500/20')
      expect(badge).toHaveClass('text-red-400')
    })

    it('should apply orange styling for refunded status', () => {
      const { container } = render(
        <OrderStatusBadge status="refunded" type="payment" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-orange-500/20')
      expect(badge).toHaveClass('text-orange-400')
    })

    it('should apply gray styling for unfulfilled status', () => {
      const { container } = render(
        <OrderStatusBadge status="unfulfilled" type="fulfillment" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-gray-500/20')
      expect(badge).toHaveClass('text-gray-400')
    })

    it('should apply green styling for fulfilled status', () => {
      const { container } = render(
        <OrderStatusBadge status="fulfilled" type="fulfillment" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500/20')
      expect(badge).toHaveClass('text-green-400')
    })
  })

  describe('Common Badge Styles', () => {
    it('should have rounded-full class', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('rounded-full')
    })

    it('should have font-medium class', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('font-medium')
    })

    it('should have text-xs class', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('text-xs')
    })

    it('should have border class', () => {
      const { container } = render(
        <OrderStatusBadge status="pending" type="order" />,
      )
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('border')
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
      expect(badge).toHaveClass('bg-gray-500/20')
    })
  })

  describe('Default Type', () => {
    it('should default to order type', () => {
      render(<OrderStatusBadge status="pending" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })
})
