import { describe, expect, it, vi, beforeEach } from 'vitest'

import { OrderDetail } from './OrderDetail'

import type { Order } from '../../../types/order'

import { createOrder, createOrderItem } from '@/test/factories/data'
import { render, screen } from '@/test/test-utils'

const createTestOrder = (overrides = {}): Order => {
  const baseOrder = createOrder()
  return {
    id: baseOrder.id,
    orderNumber: 1001,
    customerId: baseOrder.customerId,
    email: 'customer@example.com',
    subtotal: 89.99,
    shippingTotal: 5.99,
    taxTotal: 8.25,
    total: 104.23,
    currency: 'USD',
    status: baseOrder.status,
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    shippingMethod: 'Standard Shipping',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
      address1: '123 Main St',
      address2: 'Suite 100',
      city: 'New York',
      province: 'NY',
      zip: '10001',
      country: 'United States',
      countryCode: 'US',
      phone: '+1-555-1234',
    },
    paymentProvider: 'stripe',
    paymentId: 'pi_123456789',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
    paidAt: new Date('2024-01-15T10:31:00'),
    items: [
      {
        ...createOrderItem(),
        variantId: 'var-1',
        title: 'Test Product',
        variantTitle: 'Size M / Blue',
        sku: 'SKU-001',
        price: 44.99,
        quantity: 2,
        total: 89.98,
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date('2024-01-15T10:30:00'),
      },
    ],
    ...overrides,
  }
}

const MOCK_ORDER = createTestOrder()

describe('OrderDetail Component', () => {
  const mockOnUpdateStatus = vi.fn()

  beforeEach(() => {
    mockOnUpdateStatus.mockClear()
    mockOnUpdateStatus.mockResolvedValue(undefined)
  })

  describe('Header', () => {
    it('should display order number', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Order #1001')).toBeInTheDocument()
    })

    it('should display order date', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText(/Placed on/)).toBeInTheDocument()
    })

    it('should display status badges', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      // Status badges are displayed capitalized - may appear multiple times in header and elsewhere
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Unfulfilled').length).toBeGreaterThan(0)
    })
  })

  describe('Order Items Section', () => {
    it('should display section heading', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Order Items')).toBeInTheDocument()
    })

    it('should display item title', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Test Product')).toBeInTheDocument()
    })

    it('should display variant title', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Size M / Blue')).toBeInTheDocument()
    })

    it('should display SKU', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('SKU: SKU-001')).toBeInTheDocument()
    })

    it('should display item image', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      const img = screen.getByAltText('Test Product')
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
    })
  })

  describe('Order Totals', () => {
    it('should display subtotal', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getByText('$89.99')).toBeInTheDocument()
    })

    it('should display shipping cost', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      // "Shipping" may appear multiple times (in totals and as shipping method label)
      expect(screen.getAllByText(/Shipping/).length).toBeGreaterThan(0)
      expect(screen.getByText('$5.99')).toBeInTheDocument()
    })

    it('should display tax', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Tax')).toBeInTheDocument()
      expect(screen.getByText('$8.25')).toBeInTheDocument()
    })

    it('should display total', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('$104.23')).toBeInTheDocument()
    })

    it('should show "Free" for zero shipping', () => {
      const orderWithFreeShipping = {
        ...MOCK_ORDER,
        shippingTotal: 0,
      }

      render(
        <OrderDetail
          order={orderWithFreeShipping}
          onUpdateStatus={mockOnUpdateStatus}
        />,
      )

      expect(screen.getByText('Free')).toBeInTheDocument()
    })
  })

  describe('Payment Section', () => {
    it('should display payment heading', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    it('should display payment provider', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Provider')).toBeInTheDocument()
      expect(screen.getByText('stripe')).toBeInTheDocument()
    })

    it('should display payment ID', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Payment ID')).toBeInTheDocument()
      expect(screen.getByText('pi_123456789')).toBeInTheDocument()
    })
  })

  describe('Customer Section', () => {
    it('should display customer heading', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Customer')).toBeInTheDocument()
    })

    it('should display customer email', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('customer@example.com')).toBeInTheDocument()
    })

    it('should display customer name', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      // Customer name appears in both Customer section and Shipping section
      const names = screen.getAllByText('John Doe')
      expect(names.length).toBeGreaterThan(0)
    })
  })

  describe('Shipping Section', () => {
    it('should display shipping heading', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      // "Shipping" appears as both section header and in totals
      const shippingTexts = screen.getAllByText('Shipping')
      expect(shippingTexts.length).toBeGreaterThan(0)
    })

    it('should display shipping address', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.getByText('Suite 100')).toBeInTheDocument()
      expect(screen.getByText('United States')).toBeInTheDocument()
    })

    it('should display shipping method', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText(/Method: Standard Shipping/)).toBeInTheDocument()
    })
  })

  describe('Status Update', () => {
    it('should display update status section', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Update Status')).toBeInTheDocument()
    })

    it('should display order status dropdown', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Order Status')).toBeInTheDocument()
    })

    it('should display fulfillment dropdown', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.getByText('Fulfillment')).toBeInTheDocument()
    })

    it('should not show save button when no changes', () => {
      render(
        <OrderDetail order={MOCK_ORDER} onUpdateStatus={mockOnUpdateStatus} />,
      )

      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
    })
  })
})
