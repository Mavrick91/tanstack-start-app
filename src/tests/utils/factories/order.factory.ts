import { createAddress } from './address.factory'

import type {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '../../../types/checkout'
import type { Order, OrderItem, OrderListItem } from '../../../types/order'

/**
 * Creates a valid OrderItem with sensible defaults.
 */
export const createOrderItem = (
  overrides: Partial<OrderItem> = {},
): OrderItem => {
  const price = overrides.price ?? 29.99
  const quantity = overrides.quantity ?? 1
  const total = overrides.total ?? price * quantity

  return {
    id: 'item-123',
    orderId: 'order-123',
    productId: 'prod-123',
    variantId: 'var-456',
    title: 'Test Product',
    variantTitle: 'Size M',
    sku: 'SKU-001',
    price,
    quantity,
    total,
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

/**
 * Creates a valid Order with sensible defaults.
 * By default, creates a paid, unfulfilled order.
 */
export const createOrder = (overrides: Partial<Order> = {}): Order => {
  const items = overrides.items ?? [createOrderItem()]
  const subtotal =
    overrides.subtotal ?? items.reduce((sum, item) => sum + item.total, 0)
  const shippingTotal = overrides.shippingTotal ?? 5.99
  const taxTotal = overrides.taxTotal ?? 0
  const total = overrides.total ?? subtotal + shippingTotal + taxTotal

  return {
    id: 'order-123',
    orderNumber: 1001,
    email: 'customer@example.com',
    subtotal,
    shippingTotal,
    taxTotal,
    total,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    shippingMethod: 'Standard Shipping',
    shippingAddress: createAddress(),
    paymentProvider: 'stripe',
    paymentId: 'pi_test_123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    paidAt: new Date('2024-01-15T10:00:00Z'),
    items,
    ...overrides,
  }
}

/**
 * Creates an OrderListItem for table display.
 */
export const createOrderListItem = (
  overrides: Partial<OrderListItem> = {},
): OrderListItem => {
  return {
    id: 'order-123',
    orderNumber: 1001,
    email: 'customer@example.com',
    total: 35.98,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    itemCount: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

/**
 * Pre-configured order variants for common test scenarios.
 */
export const orderVariants = {
  /** Paid, unfulfilled order (default) */
  pending: (): Order => createOrder(),

  /** Processing order */
  processing: (): Order =>
    createOrder({
      status: 'processing' as OrderStatus,
    }),

  /** Shipped order */
  shipped: (): Order =>
    createOrder({
      status: 'shipped' as OrderStatus,
      fulfillmentStatus: 'fulfilled' as FulfillmentStatus,
    }),

  /** Delivered order */
  delivered: (): Order =>
    createOrder({
      status: 'delivered' as OrderStatus,
      fulfillmentStatus: 'fulfilled' as FulfillmentStatus,
    }),

  /** Cancelled order */
  cancelled: (): Order =>
    createOrder({
      status: 'cancelled' as OrderStatus,
      cancelledAt: new Date('2024-01-16T10:00:00Z'),
    }),

  /** Refunded order */
  refunded: (): Order =>
    createOrder({
      status: 'cancelled' as OrderStatus,
      paymentStatus: 'refunded' as PaymentStatus,
      cancelledAt: new Date('2024-01-16T10:00:00Z'),
    }),

  /** Payment pending */
  paymentPending: (): Order =>
    createOrder({
      paymentStatus: 'pending' as PaymentStatus,
      paidAt: undefined,
    }),

  /** Payment failed */
  paymentFailed: (): Order =>
    createOrder({
      paymentStatus: 'failed' as PaymentStatus,
      paidAt: undefined,
    }),

  /** Partially fulfilled */
  partiallyFulfilled: (): Order =>
    createOrder({
      fulfillmentStatus: 'partial' as FulfillmentStatus,
    }),

  /** Order with PayPal payment */
  paypal: (): Order =>
    createOrder({
      paymentProvider: 'paypal',
      paymentId: 'PAYPAL-ORDER-123',
    }),

  /** Order with multiple items */
  multipleItems: (): Order =>
    createOrder({
      items: [
        createOrderItem({
          id: 'item-1',
          productId: 'prod-1',
          title: 'Product 1',
          price: 29.99,
        }),
        createOrderItem({
          id: 'item-2',
          productId: 'prod-2',
          title: 'Product 2',
          price: 49.99,
          quantity: 2,
          total: 99.98,
        }),
      ],
      subtotal: 129.97,
      total: 135.96,
    }),

  /** Order with customer account */
  withCustomer: (): Order =>
    createOrder({
      customerId: 'cust-123',
    }),

  /** High-value order */
  highValue: (): Order =>
    createOrder({
      subtotal: 500,
      shippingTotal: 0, // Free shipping
      total: 500,
    }),
}

/**
 * Creates multiple orders for testing lists/pagination.
 */
export const createOrderList = (count: number): OrderListItem[] => {
  return Array.from({ length: count }, (_, i) =>
    createOrderListItem({
      id: `order-${i + 1}`,
      orderNumber: 1001 + i,
      email: `customer${i + 1}@example.com`,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Each day older
    }),
  )
}
