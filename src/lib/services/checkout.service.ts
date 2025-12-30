import { eq } from 'drizzle-orm'

import { db as defaultDb } from '../../db'
import { checkouts, orders, orderItems } from '../../db/schema'
import { getPayPalOrder as defaultGetPayPalOrder } from '../paypal'
import {
  retrievePaymentIntent as defaultRetrievePaymentIntent,
  dollarsToCents,
} from '../stripe'
import {
  validateCheckoutComplete,
  validatePaymentInput,
  validateStripePayment,
  validatePayPalPayment,
} from '../validation'

import type { AddressSnapshot } from '../../db/schema'
import type { PaymentProvider } from '../../types/checkout'

/**
 * Cart item structure from checkout.
 */
export interface CheckoutCartItem {
  productId: string
  variantId?: string
  quantity: number
  title: string
  variantTitle?: string
  sku?: string
  price: number
  imageUrl?: string
}

/**
 * Checkout from database.
 */
export interface CheckoutRecord {
  id: string
  customerId?: string | null
  email?: string | null
  cartItems: CheckoutCartItem[] | unknown[] | null
  subtotal: string
  shippingTotal: string | null
  taxTotal: string | null
  total: string
  currency: string
  shippingAddress?: AddressSnapshot | null
  billingAddress?: AddressSnapshot | null
  shippingRateId?: string | null
  shippingMethod?: string | null
  completedAt?: Date | null
}

/**
 * Order result from completion.
 */
export interface OrderResult {
  id: string
  orderNumber: number
  email: string
  total: number
  currency: string
  status: string
  paymentStatus: string
}

/**
 * Complete checkout result.
 */
export type CompleteCheckoutResult =
  | { success: true; order: OrderResult; idempotent?: boolean }
  | { success: false; error: string; status: number }

/**
 * Dependencies for checkout service.
 * Allows injection of mocks for testing.
 */
export interface CheckoutServiceDeps {
  db: typeof defaultDb
  retrievePaymentIntent: typeof defaultRetrievePaymentIntent
  getPayPalOrder: typeof defaultGetPayPalOrder
}

/**
 * Default dependencies using real implementations.
 */
const defaultDeps: CheckoutServiceDeps = {
  db: defaultDb,
  retrievePaymentIntent: defaultRetrievePaymentIntent,
  getPayPalOrder: defaultGetPayPalOrder,
}

/**
 * Error class for checkout failures with HTTP status.
 */
export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message)
    this.name = 'CheckoutError'
  }
}

/**
 * Verifies payment with the appropriate provider.
 */
async function verifyPayment(
  paymentProvider: PaymentProvider,
  paymentId: string,
  expectedAmount: number,
  deps: CheckoutServiceDeps,
): Promise<void> {
  if (paymentProvider === 'stripe') {
    const paymentIntent = await deps.retrievePaymentIntent(paymentId)
    const expectedCents = dollarsToCents(expectedAmount)

    const result = validateStripePayment(
      { status: paymentIntent.status, amount: paymentIntent.amount },
      expectedCents,
    )

    if (!result.valid) {
      throw new CheckoutError(result.error, result.status)
    }
  } else if (paymentProvider === 'paypal') {
    const paypalOrder = await deps.getPayPalOrder(paymentId)
    const capturedAmount = (
      paypalOrder as {
        status: string
        purchase_units?: Array<{
          payments?: {
            captures?: Array<{ amount?: { value?: string } }>
          }
        }>
      }
    ).purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value

    const result = validatePayPalPayment(
      { status: paypalOrder.status, capturedAmount },
      expectedAmount,
    )

    if (!result.valid) {
      throw new CheckoutError(result.error, result.status)
    }
  }
}

/**
 * Creates order and order items in a transaction.
 */
async function createOrder(
  checkout: CheckoutRecord,
  cartItems: CheckoutCartItem[],
  paymentProvider: PaymentProvider,
  paymentId: string,
  deps: CheckoutServiceDeps,
): Promise<OrderResult> {
  return await deps.db.transaction(async (tx) => {
    const [newOrder] = await tx
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
        billingAddress: checkout.billingAddress,
        paymentProvider,
        paymentId,
        paidAt: new Date(),
      })
      .returning()

    await tx.insert(orderItems).values(
      cartItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        variantId: item.variantId || null,
        title: item.title,
        variantTitle: item.variantTitle || null,
        sku: item.sku || null,
        price: item.price.toFixed(2),
        quantity: item.quantity,
        total: (item.price * item.quantity).toFixed(2),
        imageUrl: item.imageUrl || null,
      })),
    )

    await tx
      .update(checkouts)
      .set({
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(checkouts.id, checkout.id))

    return {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      email: newOrder.email,
      total: parseFloat(newOrder.total),
      currency: newOrder.currency,
      status: newOrder.status,
      paymentStatus: newOrder.paymentStatus,
    }
  })
}

/**
 * Handles duplicate order (idempotency).
 */
async function findExistingOrder(
  paymentId: string,
  deps: CheckoutServiceDeps,
): Promise<OrderResult | null> {
  const [existingOrder] = await deps.db
    .select()
    .from(orders)
    .where(eq(orders.paymentId, paymentId))
    .limit(1)

  if (existingOrder) {
    return {
      id: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      email: existingOrder.email,
      total: parseFloat(existingOrder.total),
      currency: existingOrder.currency,
      status: existingOrder.status,
      paymentStatus: existingOrder.paymentStatus,
    }
  }

  return null
}

/**
 * Completes a checkout by verifying payment and creating an order.
 *
 * @example
 * ```typescript
 * // Production usage
 * const result = await completeCheckout(checkoutId, { paymentProvider: 'stripe', paymentId: 'pi_123' })
 *
 * // Test usage with mocks
 * const result = await completeCheckout(
 *   checkoutId,
 *   { paymentProvider: 'stripe', paymentId: 'pi_123' },
 *   { db: mockDb, retrievePaymentIntent: mockStripe, getPayPalOrder: mockPayPal }
 * )
 * ```
 */
export async function completeCheckout(
  checkoutId: string,
  paymentInput: { paymentProvider?: string; paymentId?: string },
  deps: CheckoutServiceDeps = defaultDeps,
): Promise<CompleteCheckoutResult> {
  // 1. Validate payment input
  const paymentValidation = validatePaymentInput(paymentInput)
  if (!paymentValidation.valid) {
    return {
      success: false,
      error: paymentValidation.error,
      status: paymentValidation.status ?? 400,
    }
  }
  const { paymentProvider, paymentId } = paymentValidation.data!

  // 2. Fetch checkout
  const [checkout] = await deps.db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  // 3. Validate checkout
  const checkoutForValidation = checkout
    ? {
        id: checkout.id,
        email: checkout.email,
        shippingAddress: checkout.shippingAddress,
        shippingRateId: checkout.shippingRateId,
        completedAt: checkout.completedAt,
        cartItems: checkout.cartItems as unknown[] | null,
      }
    : null
  const checkoutValidation = validateCheckoutComplete(checkoutForValidation)
  if (!checkoutValidation.valid) {
    return {
      success: false,
      error: checkoutValidation.error,
      status: checkoutValidation.status ?? 400,
    }
  }

  const cartItems = checkout.cartItems as CheckoutCartItem[]
  const expectedAmount = parseFloat(checkout.total)

  // 4. Verify payment with provider
  try {
    await verifyPayment(paymentProvider, paymentId, expectedAmount, deps)
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: 'Failed to verify payment', status: 500 }
  }

  // 5. Create order
  try {
    const order = await createOrder(
      checkout as CheckoutRecord,
      cartItems,
      paymentProvider,
      paymentId,
      deps,
    )
    return { success: true, order }
  } catch (txError) {
    // Handle duplicate (idempotent request)
    const error = txError as { code?: string }
    if (error.code === '23505') {
      const existingOrder = await findExistingOrder(paymentId, deps)
      if (existingOrder) {
        return { success: true, order: existingOrder, idempotent: true }
      }
    }
    throw txError
  }
}
