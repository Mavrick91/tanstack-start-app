/**
 * Type definitions for checkout operations.
 * Extracted from checkout.ts for better organization.
 */

/**
 * Localized string with required English and optional French/Indonesian translations.
 */
export type LocalizedString = { en: string; fr?: string; id?: string }

/**
 * Cart item input (minimal data needed to add item to cart).
 */
export type CartItem = {
  productId: string
  variantId?: string
  quantity: number
}

/**
 * Cart item with full product details (used in checkout session).
 */
export type CheckoutCartItem = {
  productId: string
  variantId: string
  quantity: number
  title: string
  variantTitle?: string
  sku?: string
  price: number
  imageUrl?: string
}

/**
 * Input for creating a new checkout session.
 */
export type CreateCheckoutInput = {
  items: CartItem[]
  currency?: string
}

/**
 * Successful result of creating a checkout.
 */
export type CreateCheckoutResult = {
  success: true
  checkout: {
    id: string
    cartItems: CheckoutCartItem[]
    subtotal: number
    shippingTotal: number
    taxTotal: number
    total: number
    currency: string
    expiresAt: Date
  }
}

/**
 * Error result from checkout operations.
 */
export type CheckoutError = {
  success: false
  error: string
  status: number
}

/**
 * Input for saving customer information to checkout.
 */
export type SaveCustomerInput = {
  checkoutId: string
  email: string
  firstName?: string
  lastName?: string
}

/**
 * Successful result of saving customer info.
 */
export type SaveCustomerResult = {
  success: true
  checkout: {
    id: string
    email: string
    customerId: string | null
  }
}

/**
 * Shipping address structure.
 */
export type ShippingAddress = {
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  provinceCode?: string
  country: string
  countryCode: string
  zip: string
  phone?: string
}

/**
 * Input for saving shipping address to checkout.
 */
export type ShippingAddressInput = {
  checkoutId: string
  address: ShippingAddress
}

/**
 * Successful result of saving shipping address.
 */
export type SaveShippingAddressResult = {
  success: true
  checkout: {
    id: string
    shippingAddress: ShippingAddress
  }
}

/**
 * Input for saving shipping method to checkout.
 */
export type SaveShippingMethodInput = {
  checkoutId: string
  shippingRateId: string
}

/**
 * Successful result of saving shipping method.
 */
export type SaveShippingMethodResult = {
  success: true
  checkout: {
    id: string
    shippingRateId: string
    shippingMethod: string
    shippingTotal: number
    total: number
  }
}

/**
 * Input for completing a checkout with payment.
 */
export type CompleteCheckoutInput = {
  checkoutId: string
  paymentProvider: 'stripe' | 'paypal'
  paymentId: string
}

/**
 * Successful result of completing checkout.
 */
export type CompleteCheckoutResult = {
  success: true
  order: {
    id: string
    orderNumber: number
    email: string
    total: number
  }
}
