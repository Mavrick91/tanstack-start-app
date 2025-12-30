import type { ValidationResult } from './checkout'
import type { PaymentProvider } from '../../types/checkout'

/**
 * Payment input for validation.
 */
export interface PaymentInput {
  paymentProvider?: PaymentProvider | string | null
  paymentId?: string | null
}

/**
 * Validated payment data.
 */
export interface ValidatedPayment {
  paymentProvider: PaymentProvider
  paymentId: string
}

/**
 * Validates payment input has required fields.
 *
 * @example
 * ```typescript
 * const result = validatePaymentInput(body)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * const { paymentProvider, paymentId } = result.data
 * ```
 */
export function validatePaymentInput(
  input: PaymentInput,
): ValidationResult<ValidatedPayment> {
  if (!input.paymentProvider || !input.paymentId) {
    return {
      valid: false,
      error: 'Payment provider and payment ID are required',
      status: 400,
    }
  }

  if (!isValidPaymentProvider(input.paymentProvider)) {
    return {
      valid: false,
      error: 'Invalid payment provider',
      status: 400,
    }
  }

  return {
    valid: true,
    data: {
      paymentProvider: input.paymentProvider as PaymentProvider,
      paymentId: input.paymentId,
    },
  }
}

/**
 * Type guard for valid payment providers.
 */
export function isValidPaymentProvider(
  provider: string,
): provider is PaymentProvider {
  return provider === 'stripe' || provider === 'paypal'
}

/**
 * Stripe payment verification result.
 */
export interface StripePaymentVerification {
  status: string
  amount: number
}

/**
 * PayPal payment verification result.
 */
export interface PayPalPaymentVerification {
  status: string
  capturedAmount?: string
}

/**
 * Validates Stripe payment is successful and amount matches.
 */
export function validateStripePayment(
  payment: StripePaymentVerification,
  expectedAmountCents: number,
): ValidationResult {
  if (payment.status !== 'succeeded') {
    return {
      valid: false,
      error: `Payment not completed. Status: ${payment.status}`,
      status: 400,
    }
  }

  if (payment.amount !== expectedAmountCents) {
    return {
      valid: false,
      error: 'Payment amount mismatch',
      status: 400,
    }
  }

  return { valid: true }
}

/**
 * Validates PayPal payment is successful and amount matches.
 */
export function validatePayPalPayment(
  payment: PayPalPaymentVerification,
  expectedAmountDollars: number,
): ValidationResult {
  if (payment.status !== 'COMPLETED') {
    return {
      valid: false,
      error: `Payment not completed. Status: ${payment.status}`,
      status: 400,
    }
  }

  if (
    payment.capturedAmount &&
    parseFloat(payment.capturedAmount) !== expectedAmountDollars
  ) {
    return {
      valid: false,
      error: 'Payment amount mismatch',
      status: 400,
    }
  }

  return { valid: true }
}

/**
 * Converts dollars to cents (for Stripe).
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Converts cents to dollars (from Stripe).
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}
