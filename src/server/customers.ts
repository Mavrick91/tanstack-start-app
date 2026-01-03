/**
 * Customers Server Functions
 *
 * Uses standardized patterns:
 * - Top-level imports for database
 * - Error helpers for consistent responses
 *
 * Note: Customer auth is handled inline (not via adminMiddleware)
 * because customers have different auth requirements than admins.
 */

import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import { getOrderItemsByOrderIds, parseDecimal } from './orders'
import { addresses, customers, orderItems, orders } from '../db/schema'

// ============================================
// TYPES
// ============================================

export type CustomerProfile = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  acceptsMarketing: boolean | null
  createdAt: Date
  role?: string
}

export type CustomerAddress = {
  id: string
  type: string
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string | null
  provinceCode: string | null
  country: string
  countryCode: string
  zip: string
  phone: string | null
  isDefault: boolean | null
}

// ============================================
// HELPERS
// ============================================

// Get customer profile for the authenticated user
const getCustomerForUser = async (userId: string) => {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1)
  return customer
}

// Require authenticated user with customer profile
const requireCustomer = async () => {
  const { getMeFn } = await import('./auth')
  const user = await getMeFn()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const customer = await getCustomerForUser(user.id)
  if (!customer) {
    throw new Error('Customer profile not found')
  }

  return { user, customer }
}

// ============================================
// SERVER FUNCTIONS
// ============================================

// Check customer session (returns null if not authenticated, doesn't throw)
export const getCustomerSessionFn = createServerFn().handler(async () => {
  const { getMeFn } = await import('./auth')
  const user = await getMeFn()
  if (!user) {
    return { customer: null }
  }

  const customer = await getCustomerForUser(user.id)
  if (!customer) {
    return { customer: null }
  }

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      acceptsMarketing: customer.acceptsMarketing,
      createdAt: customer.createdAt,
      role: user.role,
    } satisfies CustomerProfile,
  }
})

// Get customer profile
export const getCustomerMeFn = createServerFn().handler(async () => {
  const { customer } = await requireCustomer()

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      acceptsMarketing: customer.acceptsMarketing,
      createdAt: customer.createdAt,
    } satisfies CustomerProfile,
  }
})

// Update customer profile
const updateCustomerInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  acceptsMarketing: z.boolean().optional(),
})

export const updateCustomerMeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => updateCustomerInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()

    const { firstName, lastName, phone, acceptsMarketing } = data

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        firstName:
          firstName !== undefined
            ? firstName?.trim() || null
            : customer.firstName,
        lastName:
          lastName !== undefined ? lastName?.trim() || null : customer.lastName,
        phone: phone !== undefined ? phone?.trim() || null : customer.phone,
        acceptsMarketing:
          acceptsMarketing !== undefined
            ? acceptsMarketing
            : customer.acceptsMarketing,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id))
      .returning()

    return {
      customer: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        phone: updatedCustomer.phone,
        acceptsMarketing: updatedCustomer.acceptsMarketing,
        createdAt: updatedCustomer.createdAt,
      } satisfies CustomerProfile,
    }
  })

// Get customer addresses
export const getCustomerAddressesFn = createServerFn().handler(async () => {
  const { customer } = await requireCustomer()

  const customerAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customer.id))

  return {
    addresses: customerAddresses.map(
      (addr) =>
        ({
          id: addr.id,
          type: addr.type,
          firstName: addr.firstName,
          lastName: addr.lastName,
          company: addr.company,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          province: addr.province,
          provinceCode: addr.provinceCode,
          country: addr.country,
          countryCode: addr.countryCode,
          zip: addr.zip,
          phone: addr.phone,
          isDefault: addr.isDefault,
        }) satisfies CustomerAddress,
    ),
  }
})

// Create address
const createAddressInputSchema = z.object({
  type: z.enum(['shipping', 'billing']).default('shipping'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  countryCode: z.string().min(1, 'Country code is required'),
  zip: z.string().min(1, 'ZIP/Postal code is required'),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const createAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => createAddressInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()

    const {
      type,
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      province,
      provinceCode,
      country,
      countryCode,
      zip,
      phone,
      isDefault,
    } = data

    // If setting as default, unset other default addresses of same type
    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(
          and(eq(addresses.customerId, customer.id), eq(addresses.type, type)),
        )
    }

    const [newAddress] = await db
      .insert(addresses)
      .values({
        customerId: customer.id,
        type,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company?.trim() || null,
        address1: address1.trim(),
        address2: address2?.trim() || null,
        city: city.trim(),
        province: province?.trim() || null,
        provinceCode: provinceCode?.trim() || null,
        country: country.trim(),
        countryCode: countryCode.trim(),
        zip: zip.trim(),
        phone: phone?.trim() || null,
        isDefault,
      })
      .returning()

    return {
      address: {
        id: newAddress.id,
        type: newAddress.type,
        firstName: newAddress.firstName,
        lastName: newAddress.lastName,
        company: newAddress.company,
        address1: newAddress.address1,
        address2: newAddress.address2,
        city: newAddress.city,
        province: newAddress.province,
        provinceCode: newAddress.provinceCode,
        country: newAddress.country,
        countryCode: newAddress.countryCode,
        zip: newAddress.zip,
        phone: newAddress.phone,
        isDefault: newAddress.isDefault,
      } satisfies CustomerAddress,
    }
  })

// Delete address
const deleteAddressInputSchema = z.object({
  addressId: z.string().uuid(),
})

export const deleteAddressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => deleteAddressInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    const { addressId } = data

    // Verify address belongs to customer
    const [address] = await db
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.id, addressId), eq(addresses.customerId, customer.id)),
      )
      .limit(1)

    if (!address) {
      throw new Error('Address not found')
    }

    await db.delete(addresses).where(eq(addresses.id, addressId))

    return { deleted: true }
  })

// Get customer orders with pagination
const getCustomerOrdersInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
})

export const getCustomerOrdersFn = createServerFn()
  .inputValidator((data: unknown) => getCustomerOrdersInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()

    const { page, limit } = data

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.customerId, customer.id))

    // Get orders with pagination
    const offset = (page - 1) * limit
    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset)

    // Get order items for all orders in a single query (fixes N+1)
    const orderIds = customerOrders.map((o) => o.id)
    const itemsByOrderId = await getOrderItemsByOrderIds(orderIds)

    const ordersWithItems = customerOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      subtotal: parseDecimal(order.subtotal),
      shippingTotal: parseDecimal(order.shippingTotal),
      taxTotal: parseDecimal(order.taxTotal),
      total: parseDecimal(order.total),
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      shippingMethod: order.shippingMethod,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items: (itemsByOrderId.get(order.id) || []).map(
        (item: typeof orderItems.$inferSelect) => ({
          id: item.id,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          price: parseDecimal(item.price),
          total: parseDecimal(item.total),
          imageUrl: item.imageUrl,
        }),
      ),
    }))

    return {
      orders: ordersWithItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })

// Get single customer order by ID
const getCustomerOrderByIdInputSchema = z.object({
  orderId: z.string(),
})

export const getCustomerOrderByIdFn = createServerFn()
  .inputValidator((data: unknown) =>
    getCustomerOrderByIdInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    const { orderId } = data

    // Fetch order and verify it belongs to the customer
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customer.id)))
      .limit(1)

    if (!order) {
      return { order: null }
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        subtotal: parseDecimal(order.subtotal),
        shippingTotal: parseDecimal(order.shippingTotal),
        taxTotal: parseDecimal(order.taxTotal),
        total: parseDecimal(order.total),
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          price: parseDecimal(item.price),
          total: parseDecimal(item.total),
          imageUrl: item.imageUrl,
        })),
      },
    }
  })
