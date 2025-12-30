import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../../../../db'
import { orders } from '../../../../db/schema'
import {
  createCheckout,
  saveCustomerInfo,
  saveShippingAddress,
  saveShippingMethod,
  completeCheckout,
} from '../../../../server/checkout'
import {
  cleanupTestData,
  resetTestIds,
  seedProduct,
  getCheckout,
} from '../../../../test/helpers/db-test'

const validAddress = {
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Main Street',
  city: 'New York',
  country: 'United States',
  countryCode: 'US',
  zip: '10001',
}

async function createReadyCheckout() {
  const { product, variant } = await seedProduct({ price: 50.0 })
  const createResult = await createCheckout({
    items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
  })
  if (!createResult.success) throw new Error('Failed to create checkout')

  await saveCustomerInfo({
    checkoutId: createResult.checkout.id,
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
  })

  await saveShippingAddress({
    checkoutId: createResult.checkout.id,
    address: validAddress,
  })

  await saveShippingMethod({
    checkoutId: createResult.checkout.id,
    shippingRateId: 'standard',
  })

  return { checkout: createResult.checkout, product, variant }
}

describe('completeCheckout', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
    // Also clean up any orders created
    await db.delete(orders).where(eq(orders.email, 'customer@example.com'))
  })

  describe('Happy Path', () => {
    it('creates order from complete checkout', async () => {
      const { checkout } = await createReadyCheckout()

      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test_123',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.order.id).toBeDefined()
      expect(result.order.orderNumber).toBeDefined()
      expect(result.order.email).toBe('customer@example.com')
      expect(result.order.total).toBeGreaterThan(0)
    })

    it('marks checkout as completed', async () => {
      const { checkout } = await createReadyCheckout()

      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test_456',
      })

      expect(result.success).toBe(true)

      const savedCheckout = await getCheckout(checkout.id)
      expect(savedCheckout.completedAt).toBeDefined()
      expect(savedCheckout.completedAt).not.toBeNull()
    })

    it('saves payment provider info', async () => {
      const { checkout } = await createReadyCheckout()

      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test_789',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Verify order has payment info
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, result.order.id))

      expect(order.paymentProvider).toBe('stripe')
      expect(order.paymentId).toBe('pi_test_789')
      expect(order.paymentStatus).toBe('paid')
      expect(order.paidAt).toBeDefined()
    })

    it('works with PayPal payment', async () => {
      const { checkout } = await createReadyCheckout()

      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'paypal',
        paymentId: 'PAYPAL_ORDER_123',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, result.order.id))

      expect(order.paymentProvider).toBe('paypal')
      expect(order.paymentId).toBe('PAYPAL_ORDER_123')
    })

    it('creates order with correct totals', async () => {
      const { checkout } = await createReadyCheckout()

      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_totals_test',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, result.order.id))

      // Checkout was 2 x $50 = $100 subtotal + $5.99 shipping + tax
      expect(parseFloat(order.subtotal)).toBe(100.0)
      expect(parseFloat(order.shippingTotal)).toBe(5.99)
      expect(parseFloat(order.taxTotal)).toBeGreaterThan(0)
    })
  })

  describe('Validation Errors', () => {
    it('rejects non-existent checkout', async () => {
      const result = await completeCheckout({
        checkoutId: '00000000-0000-0000-0000-000000000000',
        paymentProvider: 'stripe',
        paymentId: 'pi_test',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout not found')
      expect(result.status).toBe(404)
    })

    it('rejects already completed checkout', async () => {
      const { checkout } = await createReadyCheckout()

      // Complete first time
      await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_first',
      })

      // Try to complete again
      const result = await completeCheckout({
        checkoutId: checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_second',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout already completed')
      expect(result.status).toBe(410)
    })

    it('rejects checkout without email', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Add address and shipping but NOT email
      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })
      await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'standard',
      })

      const result = await completeCheckout({
        checkoutId: createResult.checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Customer email required')
      expect(result.status).toBe(400)
    })

    it('rejects checkout without shipping address', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Add email but NOT address
      await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'test@example.com',
      })

      const result = await completeCheckout({
        checkoutId: createResult.checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Shipping address required')
      expect(result.status).toBe(400)
    })

    it('rejects checkout without shipping method', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Add email and address but NOT shipping method
      await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'test@example.com',
      })
      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      const result = await completeCheckout({
        checkoutId: createResult.checkout.id,
        paymentProvider: 'stripe',
        paymentId: 'pi_test',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Shipping method required')
      expect(result.status).toBe(400)
    })
  })
})
