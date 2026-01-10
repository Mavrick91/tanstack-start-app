/**
 * Currency conversion utilities for payment processing.
 *
 * These functions handle the conversion between dollars (used for display
 * and PayPal) and cents (used for Stripe and database storage).
 *
 * @example
 * ```typescript
 * import { dollarsToCents, centsToDollars } from '@/lib/currency'
 *
 * // Converting for Stripe payment
 * const amountInCents = dollarsToCents(99.99) // 9999
 *
 * // Converting from Stripe response
 * const amountInDollars = centsToDollars(9999) // 99.99
 * ```
 */

/**
 * Converts a dollar amount to cents.
 *
 * Used when preparing amounts for Stripe API calls (which expect cents)
 * or storing monetary values in the database.
 *
 * @param dollars - The amount in dollars (e.g., 99.99)
 * @returns The amount in cents as an integer (e.g., 9999)
 *
 * @example
 * ```typescript
 * dollarsToCents(99.99) // 9999
 * dollarsToCents(1.5)   // 150
 * dollarsToCents(0.01)  // 1
 * ```
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100)
}

/**
 * Converts a cent amount to dollars.
 *
 * Used when displaying amounts from Stripe responses or database values
 * that are stored in cents.
 *
 * @param cents - The amount in cents (e.g., 9999)
 * @returns The amount in dollars (e.g., 99.99)
 *
 * @example
 * ```typescript
 * centsToDollars(9999) // 99.99
 * centsToDollars(150)  // 1.5
 * centsToDollars(1)    // 0.01
 * ```
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100
}
