/**
 * Test Utilities
 *
 * Shared factories and mocks for consistent, maintainable tests.
 *
 * @example
 * ```typescript
 * import {
 *   createCheckout,
 *   createOrder,
 *   createMockStripe,
 *   createMockDb,
 * } from '@/tests/utils'
 *
 * describe('completeCheckout', () => {
 *   it('creates order when payment succeeds', async () => {
 *     const checkout = createCheckout({ total: 35.98 })
 *     const db = createMockDb({ data: { checkouts: [checkout] } })
 *     const stripe = createMockStripe({ paymentStatus: 'succeeded' })
 *
 *     const result = await completeCheckout(checkout.id, payment, { db, stripeClient: stripe })
 *
 *     expect(result.order.paymentStatus).toBe('paid')
 *   })
 * })
 * ```
 */

// Factories - create valid test data with sensible defaults
export * from './factories'

// Mocks - consistent mock implementations for external dependencies
export * from './mocks'
