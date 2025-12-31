/**
 * Checkout server functions and business logic.
 * Provides type-safe server functions for checkout operations.
 */

import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db'
import {
  checkouts,
  products,
  productVariants,
  productImages,
  customers,
  orders,
  orderItems,
} from '../db/schema'
import { calculateTax } from '../lib/tax'
import { normalizeEmail } from '../lib/validation'
import { SHIPPING_RATES, FREE_SHIPPING_THRESHOLD } from '../types/checkout'

type LocalizedString = { en: string; fr?: string; id?: string }

// =============================================================================
// Types
// =============================================================================

export type CartItem = {
  productId: string
  variantId?: string
  quantity: number
}

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

export type CreateCheckoutInput = {
  items: CartItem[]
  currency?: string
}

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

export type CheckoutError = {
  success: false
  error: string
  status: number
}

// =============================================================================
// Create Checkout
// =============================================================================

export const createCheckout = async (input: CreateCheckoutInput) => {
  const { items, currency = 'USD' } = input

  // Validate input
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'Cart items are required', status: 400 }
  }

  // Get all product and variant data
  const productIds = [...new Set(items.map((item) => item.productId))]
  const variantIds = items
    .filter((item) => item.variantId)
    .map((item) => item.variantId!)

  const productsData = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds))

  const variantsData =
    variantIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.id, variantIds))
      : await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds))
          .orderBy(asc(productVariants.position))

  // Get first image for each product
  const imagesData = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.position))

  const productMap = new Map(productsData.map((p) => [p.id, p]))
  const variantMap = new Map(variantsData.map((v) => [v.id, v]))
  const imageMap = new Map<string, string>()
  for (const img of imagesData) {
    if (!imageMap.has(img.productId)) {
      imageMap.set(img.productId, img.url)
    }
  }

  // Build cart items with full details
  const cartItems: CheckoutCartItem[] = []
  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return {
        success: false,
        error: `Product not found: ${item.productId}`,
        status: 404,
      }
    }

    let variant = item.variantId ? variantMap.get(item.variantId) : null

    // If no specific variant, get first variant for this product
    if (!variant) {
      variant = variantsData.find((v) => v.productId === item.productId)
    }

    if (!variant) {
      return {
        success: false,
        error: `Variant not found for product: ${item.productId}`,
        status: 404,
      }
    }

    const productName = (product.name as LocalizedString).en

    cartItems.push({
      productId: item.productId,
      variantId: variant.id,
      quantity: item.quantity,
      title: productName,
      variantTitle:
        variant.title !== 'Default Title' ? variant.title : undefined,
      sku: variant.sku || undefined,
      price: parseFloat(variant.price),
      imageUrl: imageMap.get(item.productId),
    })
  }

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  // Default shipping (standard rate or free if over threshold)
  const defaultShippingRate =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATES[0].price
  const shippingTotal = defaultShippingRate

  const taxTotal = calculateTax(subtotal)
  const total = subtotal + shippingTotal + taxTotal

  // Create checkout session (expires in 24 hours)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const [checkout] = await db
    .insert(checkouts)
    .values({
      cartItems,
      subtotal: subtotal.toFixed(2),
      shippingTotal: shippingTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      total: total.toFixed(2),
      currency,
      expiresAt,
    })
    .returning()

  return {
    success: true,
    checkout: {
      id: checkout.id,
      cartItems: checkout.cartItems as CheckoutCartItem[],
      subtotal: parseFloat(checkout.subtotal),
      shippingTotal: parseFloat(checkout.shippingTotal || '0'),
      taxTotal: parseFloat(checkout.taxTotal || '0'),
      total: parseFloat(checkout.total),
      currency: checkout.currency,
      expiresAt: checkout.expiresAt,
    },
  }
}

// =============================================================================
// Save Customer Info
// =============================================================================

export type SaveCustomerInput = {
  checkoutId: string
  email: string
  firstName?: string
  lastName?: string
}

export type SaveCustomerResult = {
  success: true
  checkout: {
    id: string
    email: string
    customerId: string | null
  }
}

export const saveCustomerInfo = async (input: SaveCustomerInput) => {
  const { checkoutId, email, firstName, lastName } = input

  // Get checkout
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { success: false, error: 'Checkout not found', status: 404 }
  }

  if (checkout.completedAt) {
    return { success: false, error: 'Checkout already completed', status: 410 }
  }

  if (checkout.expiresAt < new Date()) {
    return { success: false, error: 'Checkout expired', status: 410 }
  }

  const normalized = normalizeEmail(email)
  let customerId = checkout.customerId

  if (!customerId) {
    // Check for existing customer
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, normalized))
      .limit(1)

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new guest customer
      const [newCustomer] = await db
        .insert(customers)
        .values({
          email: normalized,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
        })
        .returning()

      customerId = newCustomer.id
    }
  }

  // Update checkout with customer info
  const [updatedCheckout] = await db
    .update(checkouts)
    .set({
      customerId,
      email: normalized,
      updatedAt: new Date(),
    })
    .where(eq(checkouts.id, checkoutId))
    .returning()

  return {
    success: true,
    checkout: {
      id: updatedCheckout.id,
      email: updatedCheckout.email!,
      customerId: updatedCheckout.customerId,
    },
  }
}

// =============================================================================
// Save Shipping Address
// =============================================================================

export type ShippingAddressInput = {
  checkoutId: string
  address: {
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
}

export type SaveShippingAddressResult = {
  success: true
  checkout: {
    id: string
    shippingAddress: ShippingAddressInput['address']
  }
}

export const saveShippingAddress = async (input: ShippingAddressInput) => {
  const { checkoutId, address } = input

  // Get checkout
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { success: false, error: 'Checkout not found', status: 404 }
  }

  if (checkout.completedAt) {
    return { success: false, error: 'Checkout already completed', status: 410 }
  }

  if (checkout.expiresAt < new Date()) {
    return { success: false, error: 'Checkout expired', status: 410 }
  }

  // Validate required fields
  const required = [
    'firstName',
    'lastName',
    'address1',
    'city',
    'country',
    'countryCode',
    'zip',
  ]
  for (const field of required) {
    if (!address[field as keyof typeof address]) {
      return {
        success: false,
        error: `Missing required field: ${field}`,
        status: 400,
      }
    }
  }

  // Update checkout with shipping address
  const [updatedCheckout] = await db
    .update(checkouts)
    .set({
      shippingAddress: address,
      updatedAt: new Date(),
    })
    .where(eq(checkouts.id, checkoutId))
    .returning()

  return {
    success: true,
    checkout: {
      id: updatedCheckout.id,
      shippingAddress: updatedCheckout.shippingAddress!,
    },
  }
}

// =============================================================================
// Save Shipping Method
// =============================================================================

export type SaveShippingMethodInput = {
  checkoutId: string
  shippingRateId: string
}

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

export const saveShippingMethod = async (input: SaveShippingMethodInput) => {
  const { checkoutId, shippingRateId } = input

  // Get checkout
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { success: false, error: 'Checkout not found', status: 404 }
  }

  if (checkout.completedAt) {
    return { success: false, error: 'Checkout already completed', status: 410 }
  }

  if (!checkout.shippingAddress) {
    return {
      success: false,
      error: 'Shipping address required first',
      status: 400,
    }
  }

  // Find shipping rate
  const rate = SHIPPING_RATES.find((r) => r.id === shippingRateId)
  if (!rate) {
    return { success: false, error: 'Invalid shipping rate', status: 400 }
  }

  // Recalculate total
  const subtotal = parseFloat(checkout.subtotal)
  const taxTotal = parseFloat(checkout.taxTotal || '0')
  const shippingTotal = rate.price
  const total = subtotal + taxTotal + shippingTotal

  // Update checkout
  const [updatedCheckout] = await db
    .update(checkouts)
    .set({
      shippingRateId,
      shippingMethod: rate.name,
      shippingTotal: shippingTotal.toFixed(2),
      total: total.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(checkouts.id, checkoutId))
    .returning()

  return {
    success: true,
    checkout: {
      id: updatedCheckout.id,
      shippingRateId: updatedCheckout.shippingRateId!,
      shippingMethod: updatedCheckout.shippingMethod!,
      shippingTotal: parseFloat(updatedCheckout.shippingTotal || '0'),
      total: parseFloat(updatedCheckout.total),
    },
  }
}

// =============================================================================
// Complete Checkout
// =============================================================================

export type CompleteCheckoutInput = {
  checkoutId: string
  paymentProvider: 'stripe' | 'paypal'
  paymentId: string
}

export type CompleteCheckoutResult = {
  success: true
  order: {
    id: string
    orderNumber: number
    email: string
    total: number
  }
}

export const completeCheckout = async (input: CompleteCheckoutInput) => {
  const { checkoutId, paymentProvider, paymentId } = input

  // Get checkout
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { success: false, error: 'Checkout not found', status: 404 }
  }

  if (checkout.completedAt) {
    return { success: false, error: 'Checkout already completed', status: 410 }
  }

  if (!checkout.email) {
    return { success: false, error: 'Customer email required', status: 400 }
  }

  if (!checkout.shippingAddress) {
    return { success: false, error: 'Shipping address required', status: 400 }
  }

  if (!checkout.shippingRateId) {
    return { success: false, error: 'Shipping method required', status: 400 }
  }

  // Create order in transaction
  const result = await db.transaction(async (tx) => {
    // Create order
    const [order] = await tx
      .insert(orders)
      .values({
        customerId: checkout.customerId,
        email: checkout.email!,
        subtotal: checkout.subtotal,
        shippingTotal: checkout.shippingTotal || '0',
        taxTotal: checkout.taxTotal || '0',
        total: checkout.total,
        currency: checkout.currency,
        status: 'pending',
        paymentStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        shippingMethod: checkout.shippingMethod,
        shippingAddress: checkout.shippingAddress!,
        billingAddress: checkout.billingAddress || checkout.shippingAddress!,
        paymentProvider,
        paymentId,
        paidAt: new Date(),
      })
      .returning()

    // Create order items
    const cartItems = checkout.cartItems as CheckoutCartItem[]
    await tx.insert(orderItems).values(
      cartItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        sku: item.sku,
        price: String(item.price),
        quantity: item.quantity,
        total: String(item.price * item.quantity),
        imageUrl: item.imageUrl,
      })),
    )

    // Mark checkout as completed
    await tx
      .update(checkouts)
      .set({
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(checkouts.id, checkoutId))

    return order
  })

  return {
    success: true,
    order: {
      id: result.id,
      orderNumber: result.orderNumber,
      email: result.email,
      total: parseFloat(result.total),
    },
  }
}

// =============================================================================
// Server Functions
// =============================================================================

// Input schemas
const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().min(1),
})

const createCheckoutInputSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  currency: z.string().default('USD'),
})

const checkoutIdSchema = z.object({
  checkoutId: z.string().uuid(),
})

const saveCustomerInputSchema = z.object({
  checkoutId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  country: z.string().min(1),
  countryCode: z.string().min(1),
  zip: z.string().min(1),
  phone: z.string().optional(),
})

const saveShippingAddressInputSchema = z.object({
  checkoutId: z.string().uuid(),
  address: addressSchema,
  saveAddress: z.boolean().optional(),
})

const saveShippingMethodInputSchema = z.object({
  checkoutId: z.string().uuid(),
  shippingRateId: z.string(),
})

const completeCheckoutInputSchema = z.object({
  checkoutId: z.string().uuid(),
  paymentProvider: z.enum(['stripe', 'paypal']),
  paymentId: z.string(),
})

// Create checkout server function
export const createCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(createCheckoutInputSchema.parse)
  .handler(async ({ data }) => {
    const result = await createCheckout(data)
    if (!result.success) {
      throw new Error(result.error)
    }
    return { checkout: result.checkout }
  })

// Get checkout server function
export const getCheckoutFn = createServerFn()
  .inputValidator(checkoutIdSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId } = data

    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    if (checkout.completedAt) {
      throw new Error('Checkout already completed')
    }

    if (checkout.expiresAt < new Date()) {
      throw new Error('Checkout expired')
    }

    return {
      checkout: {
        id: checkout.id,
        email: checkout.email,
        customerId: checkout.customerId,
        cartItems: checkout.cartItems as CheckoutCartItem[],
        subtotal: parseFloat(checkout.subtotal),
        shippingTotal: parseFloat(checkout.shippingTotal || '0'),
        taxTotal: parseFloat(checkout.taxTotal || '0'),
        total: parseFloat(checkout.total),
        currency: checkout.currency,
        shippingAddress: checkout.shippingAddress,
        billingAddress: checkout.billingAddress,
        shippingRateId: checkout.shippingRateId,
        shippingMethod: checkout.shippingMethod,
        expiresAt: checkout.expiresAt,
      },
    }
  })

// Get shipping rates server function
export const getShippingRatesFn = createServerFn()
  .inputValidator(checkoutIdSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId } = data

    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      throw new Error('Checkout not found')
    }

    const subtotal = parseFloat(checkout.subtotal)
    const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD

    const rates = SHIPPING_RATES.map((rate) => ({
      id: rate.id,
      name: rate.name,
      price:
        rate.id === 'standard' && qualifiesForFreeShipping ? 0 : rate.price,
      estimatedDays: rate.estimatedDays,
      isFree: rate.id === 'standard' && qualifiesForFreeShipping,
    }))

    return {
      shippingRates: rates,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      qualifiesForFreeShipping,
      amountUntilFreeShipping: qualifiesForFreeShipping
        ? 0
        : FREE_SHIPPING_THRESHOLD - subtotal,
    }
  })

// Save customer info server function
export const saveCustomerInfoFn = createServerFn({ method: 'POST' })
  .inputValidator(saveCustomerInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, email, firstName, lastName } = data

    const result = await saveCustomerInfo({
      checkoutId,
      email,
      firstName,
      lastName,
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    return { checkout: result.checkout }
  })

// Save shipping address server function
export const saveShippingAddressFn = createServerFn({ method: 'POST' })
  .inputValidator(saveShippingAddressInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, address } = data

    const result = await saveShippingAddress({ checkoutId, address })

    if (!result.success) {
      throw new Error(result.error)
    }

    return { checkout: result.checkout }
  })

// Save shipping method server function
export const saveShippingMethodFn = createServerFn({ method: 'POST' })
  .inputValidator(saveShippingMethodInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, shippingRateId } = data

    const result = await saveShippingMethod({ checkoutId, shippingRateId })

    if (!result.success) {
      throw new Error(result.error)
    }

    return { checkout: result.checkout }
  })

// Complete checkout server function
export const completeCheckoutFn = createServerFn({ method: 'POST' })
  .inputValidator(completeCheckoutInputSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId, paymentProvider, paymentId } = data

    const result = await completeCheckout({
      checkoutId,
      paymentProvider,
      paymentId,
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    return { order: result.order }
  })
