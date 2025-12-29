import type { OrderStatus, PaymentStatus, FulfillmentStatus } from './checkout'
import type { AddressSnapshot } from '../db/schema'

// Order item type
export type OrderItem = {
  id: string
  orderId: string
  productId?: string
  variantId?: string
  title: string
  variantTitle?: string
  sku?: string
  price: number
  quantity: number
  total: number
  imageUrl?: string
  createdAt: Date
}

// Order type
export type Order = {
  id: string
  orderNumber: number
  customerId?: string
  email: string
  // Financial
  subtotal: number
  shippingTotal: number
  taxTotal: number
  total: number
  currency: string
  // Status
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  // Shipping
  shippingMethod?: string
  shippingAddress: AddressSnapshot
  billingAddress?: AddressSnapshot
  // Payment
  paymentProvider?: string
  paymentId?: string
  // Timestamps
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  cancelledAt?: Date
  // Relations
  items?: OrderItem[]
}

// Order list item (for admin table)
export type OrderListItem = {
  id: string
  orderNumber: number
  email: string
  total: number
  currency: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  itemCount: number
  createdAt: Date
}

// Order filters
export type OrderFilters = {
  status?: OrderStatus | 'all'
  paymentStatus?: PaymentStatus | 'all'
  fulfillmentStatus?: FulfillmentStatus | 'all'
  search?: string
  dateFrom?: Date
  dateTo?: Date
}

// Customer type
export type Customer = {
  id: string
  userId?: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  acceptsMarketing: boolean
  createdAt: Date
  updatedAt: Date
}

// Customer address type
export type CustomerAddress = {
  id: string
  customerId: string
  type: 'shipping' | 'billing'
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
  isDefault: boolean
  createdAt: Date
}
