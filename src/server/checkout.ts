/**
 * Checkout server functions.
 * Provides type-safe server function wrappers for checkout operations.
 * Business logic is in ./checkout/logic.ts
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { FREE_SHIPPING_THRESHOLD, SHIPPING_RATES } from '../types/checkout'

// Re-export types from the types module for backwards compatibility
export type {
  LocalizedString,
  CartItem,
  CheckoutCartItem,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CheckoutError,
  SaveCustomerInput,
  SaveCustomerResult,
  ShippingAddress,
  ShippingAddressInput,
  SaveShippingAddressResult,
  SaveShippingMethodInput,
  SaveShippingMethodResult,
  CompleteCheckoutInput,
  CompleteCheckoutResult,
} from './checkout/types'

// Re-export business logic functions for backwards compatibility
export {
  createCheckout,
  saveCustomerInfo,
  saveShippingAddress,
  saveShippingMethod,
  completeCheckout,
  getDbContext,
} from './checkout/logic'

import type { CheckoutCartItem } from './checkout/types'

import {
  createCheckout,
  saveCustomerInfo,
  saveShippingAddress,
  saveShippingMethod,
  completeCheckout,
  getDbContext,
} from './checkout/logic'

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

    // Dynamic import to prevent server code leaking to client
    const { db, eq, checkouts } = await getDbContext()

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

    // Dynamic import to prevent server code leaking to client
    const { db, eq, checkouts } = await getDbContext()

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

export const createStripePaymentIntentFn = createServerFn({ method: 'GET' })
  .inputValidator(checkoutIdSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId } = data

    // Dynamic import to prevent server code leaking to client
    const { db, eq, checkouts } = await getDbContext()

    // Fetch checkout
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

    // Validate checkout is ready for payment
    if (!checkout.email) {
      throw new Error('Customer email is required')
    }

    if (!checkout.shippingAddress) {
      throw new Error('Shipping address is required')
    }

    if (!checkout.shippingRateId) {
      throw new Error('Shipping method is required')
    }

    // Dynamic import to prevent Node.js code from leaking into client bundle
    const { createPaymentIntent, getStripePublishableKey } =
      await import('../lib/stripe')
    const { dollarsToCents } = await import('../lib/currency')

    // Create Stripe PaymentIntent
    const totalInCents = dollarsToCents(parseFloat(checkout.total))

    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amount: totalInCents,
      currency: checkout.currency.toLowerCase(),
      metadata: {
        checkoutId: checkout.id,
        email: checkout.email,
      },
    })

    return {
      clientSecret,
      paymentIntentId,
      publishableKey: getStripePublishableKey(),
    }
  })

export const getCheckoutIdFromCookieFn = createServerFn().handler(async () => {
  // Dynamic imports to prevent server code from leaking into client bundle
  const { getRequest } = await import('@tanstack/react-start/server')
  const { getCheckoutIdFromRequest } = await import('../lib/checkout-auth')

  const request = getRequest()
  if (!request) return { checkoutId: null }

  const checkoutId = getCheckoutIdFromRequest(request)
  return { checkoutId }
})

/**
 * Validate checkout exists and return it (for use in beforeLoad)
 * Returns null if checkout doesn't exist or is invalid
 */
export const validateCheckoutForRouteFn = createServerFn()
  .inputValidator(checkoutIdSchema.parse)
  .handler(async ({ data }) => {
    const { checkoutId } = data

    // Dynamic import to prevent server code leaking to client
    const { db, eq, checkouts } = await getDbContext()

    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.id, checkoutId))
      .limit(1)

    if (!checkout) {
      return { valid: false, error: 'Checkout not found', checkout: null }
    }

    if (checkout.completedAt) {
      return { valid: false, error: 'Checkout completed', checkout: null }
    }

    if (checkout.expiresAt < new Date()) {
      return { valid: false, error: 'Checkout expired', checkout: null }
    }

    return {
      valid: true,
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

/**
 * Set checkout ID cookie (called after creating checkout)
 */
export const setCheckoutIdCookieFn = createServerFn({ method: 'POST' })
  .inputValidator(checkoutIdSchema.parse)
  .handler(async ({ data }) => {
    // Dynamic import to prevent Node.js code from leaking into client bundle
    const { createCheckoutIdCookie, createCheckoutSessionCookie } =
      await import('../lib/checkout-auth')

    const { checkoutId } = data
    // Return cookies to be set by the caller
    return {
      cookies: [
        createCheckoutIdCookie(checkoutId),
        createCheckoutSessionCookie(checkoutId),
      ],
    }
  })

/**
 * Clear checkout cookies (called after completing checkout)
 */
export const clearCheckoutCookiesFn = createServerFn({
  method: 'POST',
}).handler(async () => {
  // Dynamic import to prevent Node.js code from leaking into client bundle
  const { clearCheckoutIdCookie } = await import('../lib/checkout-auth')

  return {
    cookies: [
      clearCheckoutIdCookie(),
      'checkout_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    ],
  }
})
