// Checkout validation
export {
  validateCheckoutForPayment,
  validateCheckoutState,
  validateCartNotEmpty,
  validateCheckoutComplete,
} from './checkout'
export type { CheckoutForValidation, ValidationResult } from './checkout'

// Payment validation
export {
  validatePaymentInput,
  validateStripePayment,
  validatePayPalPayment,
  isValidPaymentProvider,
  dollarsToCents,
  centsToDollars,
} from './payment'
export type {
  PaymentInput,
  ValidatedPayment,
  StripePaymentVerification,
  PayPalPaymentVerification,
} from './payment'

// Email validation
export {
  validateEmailRequired,
  validateEmailFormat,
  validateEmail,
  normalizeEmail,
} from './email'

// Address validation
export { validateAddressFields, normalizeAddress } from './address'
export type { AddressInput } from './address'
