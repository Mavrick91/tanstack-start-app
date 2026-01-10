import type { PaymentProvider } from '../../types/checkout'

// Re-export currency utilities for backwards compatibility
export { dollarsToCents, centsToDollars } from '../currency'

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
export const validatePaymentInput = (input: PaymentInput) => {
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
export const isValidPaymentProvider = (
  provider: string,
): provider is PaymentProvider => {
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
export const validateStripePayment = (
  payment: StripePaymentVerification,
  expectedAmountCents: number,
) => {
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
export const validatePayPalPayment = (
  payment: PayPalPaymentVerification,
  expectedAmountDollars: number,
) => {
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
