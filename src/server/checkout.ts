/**
 * Checkout service - business logic for checkout operations.
 * Extracted from route handlers to enable testing.
 */

import { asc, eq, inArray } from 'drizzle-orm'

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

export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult | CheckoutError> {
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

export async function saveCustomerInfo(
  input: SaveCustomerInput,
): Promise<SaveCustomerResult | CheckoutError> {
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

export async function saveShippingAddress(
  input: ShippingAddressInput,
): Promise<SaveShippingAddressResult | CheckoutError> {
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

export async function saveShippingMethod(
  input: SaveShippingMethodInput,
): Promise<SaveShippingMethodResult | CheckoutError> {
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

export async function completeCheckout(
  input: CompleteCheckoutInput,
): Promise<CompleteCheckoutResult | CheckoutError> {
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
