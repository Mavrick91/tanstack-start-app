import type { AddressSnapshot } from '../db/schema'

// Shipping rate configuration
export const SHIPPING_RATES = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 5.99,
    estimatedDays: '5-7 business days',
    estimatedDaysMin: 5,
    estimatedDaysMax: 7,
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 14.99,
    estimatedDays: '2-3 business days',
    estimatedDaysMin: 2,
    estimatedDaysMax: 3,
  },
] as const

export const FREE_SHIPPING_THRESHOLD = 75.0

// Checkout step enum
export type CheckoutStep =
  | 'information'
  | 'shipping'
  | 'payment'
  | 'confirmation'

// Cart item for checkout
export type CheckoutCartItem = {
  productId: string
  variantId?: string
  quantity: number
  title: string
  variantTitle?: string
  sku?: string
  price: number
  imageUrl?: string
}

// Checkout session type
export type Checkout = {
  id: string
  customerId?: string
  email?: string
  cartItems: CheckoutCartItem[]
  subtotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  currency: string
  shippingAddress?: AddressSnapshot
  billingAddress?: AddressSnapshot
  shippingRateId?: string
  shippingMethod?: string
  completedAt?: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// Customer info form
export type CustomerInfoInput = {
  email: string
  firstName?: string
  lastName?: string
  createAccount?: boolean
  password?: string
}

// Address form input
export type AddressInput = {
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

// Shipping rate type
export type ShippingRate = {
  id: string
  name: string
  price: number
  estimatedDays: string
  estimatedDaysMin?: number
  estimatedDaysMax?: number
  isFree?: boolean
}

// Payment providers
export type PaymentProvider = 'stripe' | 'paypal'

// Payment result
export type PaymentResult = {
  success: boolean
  paymentId?: string
  error?: string
}

// Order status types
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled'
