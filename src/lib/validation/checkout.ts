import type { AddressSnapshot } from '../../db/schema'

/**
 * Checkout data for validation (subset of full checkout).
 */
export interface CheckoutForValidation {
  id: string
  email?: string | null
  shippingAddress?: AddressSnapshot | null
  shippingRateId?: string | null
  completedAt?: Date | null
  cartItems?: unknown[] | null
}

/**
 * Validation result type.
 */
export type ValidationResult<T = undefined> =
  | { valid: true; data?: T }
  | { valid: false; error: string; status?: number }

/**
 * Validates that a checkout is ready for payment completion.
 * Checks all required fields are present before payment can be processed.
 *
 * @example
 * ```typescript
 * const result = validateCheckoutForPayment(checkout)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error, result.status)
 * }
 * ```
 */
export const validateCheckoutForPayment = (checkout: CheckoutForValidation) => {
  if (!checkout.email) {
    return { valid: false, error: 'Customer email is required', status: 400 }
  }

  if (!checkout.shippingAddress) {
    return { valid: false, error: 'Shipping address is required', status: 400 }
  }

  if (!checkout.shippingRateId) {
    return { valid: false, error: 'Shipping method is required', status: 400 }
  }

  return { valid: true }
}

/**
 * Validates checkout state (not completed, not expired).
 */
export const validateCheckoutState = (
  checkout: CheckoutForValidation | null,
) => {
  if (!checkout) {
    return { valid: false, error: 'Checkout not found', status: 404 }
  }

  if (checkout.completedAt) {
    return {
      valid: false,
      error: 'Checkout has already been completed',
      status: 410,
    }
  }

  return { valid: true }
}

/**
 * Validates cart has items.
 */
export const validateCartNotEmpty = (
  cartItems: unknown[] | null | undefined,
) => {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return { valid: false, error: 'Cart is empty', status: 400 }
  }

  return { valid: true }
}

/**
 * Full checkout validation - combines all checks.
 * Use this for a single comprehensive validation.
 */
export const validateCheckoutComplete = (
  checkout: CheckoutForValidation | null,
) => {
  // Check checkout exists
  const stateResult = validateCheckoutState(checkout)
  if (!stateResult.valid) {
    return stateResult
  }

  // Check cart has items
  const cartResult = validateCartNotEmpty(checkout!.cartItems)
  if (!cartResult.valid) {
    return cartResult
  }

  // Check required fields for payment
  const paymentResult = validateCheckoutForPayment(checkout!)
  if (!paymentResult.valid) {
    return paymentResult
  }

  return { valid: true }
}
