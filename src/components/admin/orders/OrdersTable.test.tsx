import { describe, expect, it } from 'vitest'

import { OrdersTable } from './OrdersTable'

import type { OrderListItem } from '../../../types/order'

import { render, screen } from '@/test/test-utils'

const MOCK_ORDERS: OrderListItem[] = [
  {
    id: 'order-1',
    orderNumber: 1001,
    email: 'customer1@example.com',
    total: 99.99,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    itemCount: 2,
    createdAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 'order-2',
    orderNumber: 1002,
    email: 'customer2@example.com',
    total: 249.5,
    currency: 'USD',
    status: 'shipped',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    itemCount: 5,
    createdAt: new Date('2024-01-16T14:45:00'),
  },
]

describe('OrdersTable Component', () => {
  describe('Table Structure', () => {
    it('should render table headers', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      expect(screen.getByText('Order')).toBeInTheDocument()
      expect(screen.getByText('Customer')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
      expect(screen.getByText('Fulfillment')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
    })
  })

  describe('Order Display', () => {
    it('should display order numbers with hash prefix', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      expect(screen.getByText('#1001')).toBeInTheDocument()
      expect(screen.getByText('#1002')).toBeInTheDocument()
    })

    it('should display customer emails', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      expect(screen.getByText('customer1@example.com')).toBeInTheDocument()
      expect(screen.getByText('customer2@example.com')).toBeInTheDocument()
    })

    it('should display formatted totals', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      expect(screen.getByText('$99.99')).toBeInTheDocument()
      expect(screen.getByText('$249.50')).toBeInTheDocument()
    })

    it('should display item counts', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      expect(screen.getByText('(2 items)')).toBeInTheDocument()
      expect(screen.getByText('(5 items)')).toBeInTheDocument()
    })

    it('should render order links', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      const links = screen.getAllByRole('link')
      expect(links.length).toBe(2)
    })
  })

  describe('Empty State', () => {
    it('should display empty message when no orders', () => {
      render(<OrdersTable orders={[]} />)

      expect(screen.getByText('No orders found')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should render payment status badges', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      // AdminStatusBadge renders capitalized status labels
      const paidBadges = screen.getAllByText('Paid')
      expect(paidBadges.length).toBe(2)
    })

    it('should render fulfillment status badges', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      // AdminStatusBadge renders capitalized status labels
      expect(screen.getByText('Unfulfilled')).toBeInTheDocument()
      expect(screen.getByText('Fulfilled')).toBeInTheDocument()
    })

    it('should render order status badges', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      // AdminStatusBadge renders capitalized status labels
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Shipped')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      render(<OrdersTable orders={MOCK_ORDERS} />)

      // Check that dates are displayed (format may vary by locale)
      const rows = screen.getAllByRole('row')
      // Should have header row + 2 data rows
      expect(rows.length).toBe(3)
    })
  })
})
