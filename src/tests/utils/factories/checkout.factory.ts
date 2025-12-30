import { createAddress } from './address.factory'

import type { Checkout, CheckoutCartItem } from '../../../types/checkout'


/**
 * Creates a valid cart item with sensible defaults.
 */
export function createCartItem(
  overrides: Partial<CheckoutCartItem> = {},
): CheckoutCartItem {
  return {
    productId: 'prod-123',
    variantId: 'var-456',
    quantity: 1,
    title: 'Test Product',
    variantTitle: 'Size M',
    price: 29.99,
    imageUrl: 'https://example.com/image.jpg',
    ...overrides,
  }
}

/**
 * Creates a valid Checkout with sensible defaults.
 * By default, creates a complete checkout ready for payment.
 * Use overrides to customize specific fields for your test case.
 */
export function createCheckout(overrides: Partial<Checkout> = {}): Checkout {
  const cartItems = overrides.cartItems ?? [createCartItem()]
  const subtotal =
    overrides.subtotal ??
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingTotal = overrides.shippingTotal ?? 5.99
  const taxTotal = overrides.taxTotal ?? 0
  const total = overrides.total ?? subtotal + shippingTotal + taxTotal

  return {
    id: 'checkout-123',
    email: 'test@example.com',
    cartItems,
    subtotal,
    shippingTotal,
    taxTotal,
    total,
    currency: 'USD',
    shippingAddress: createAddress(),
    shippingRateId: 'standard',
    shippingMethod: 'Standard Shipping',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

/**
 * Pre-configured checkout variants for common test scenarios.
 */
export const checkoutVariants = {
  /** Complete checkout ready for payment (default) */
  readyForPayment: () => createCheckout(),

  /** Checkout missing email */
  missingEmail: () =>
    createCheckout({
      email: undefined,
    }),

  /** Checkout missing shipping address */
  missingShippingAddress: () =>
    createCheckout({
      shippingAddress: undefined,
    }),

  /** Checkout missing shipping method */
  missingShippingMethod: () =>
    createCheckout({
      shippingRateId: undefined,
      shippingMethod: undefined,
    }),

  /** Checkout with empty cart */
  emptyCart: () =>
    createCheckout({
      cartItems: [],
      subtotal: 0,
      total: 5.99, // Just shipping
    }),

  /** Expired checkout */
  expired: () =>
    createCheckout({
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    }),

  /** Already completed checkout */
  completed: () =>
    createCheckout({
      completedAt: new Date('2024-01-15T12:00:00Z'),
    }),

  /** Checkout with multiple items */
  multipleItems: () =>
    createCheckout({
      cartItems: [
        createCartItem({ productId: 'prod-1', title: 'Product 1', price: 29.99 }),
        createCartItem({ productId: 'prod-2', title: 'Product 2', price: 49.99, quantity: 2 }),
      ],
      subtotal: 129.97,
      total: 135.96,
    }),

  /** Checkout with free shipping (over threshold) */
  freeShipping: () =>
    createCheckout({
      cartItems: [createCartItem({ price: 100 })],
      subtotal: 100,
      shippingTotal: 0,
      total: 100,
    }),

  /** Checkout with express shipping */
  expressShipping: () =>
    createCheckout({
      shippingRateId: 'express',
      shippingMethod: 'Express Shipping',
      shippingTotal: 14.99,
      total: 44.98,
    }),

  /** Checkout with customer account */
  withCustomer: () =>
    createCheckout({
      customerId: 'cust-123',
    }),

  /** Minimal checkout (just created, no info filled) */
  minimal: () =>
    createCheckout({
      email: undefined,
      shippingAddress: undefined,
      billingAddress: undefined,
      shippingRateId: undefined,
      shippingMethod: undefined,
      shippingTotal: 0,
      total: 29.99,
    }),
}
