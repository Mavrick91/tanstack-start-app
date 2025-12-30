import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createCheckout, saveCustomerInfo } from '../../../../server/checkout'
import {
  cleanupTestData,
  resetTestIds,
  seedProduct,
  seedCheckout,
  getCheckout,
} from '../../../../test/helpers/db-test'

describe('saveCustomerInfo', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Happy Path', () => {
    it('saves customer email to checkout', async () => {
      // Create a checkout first
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Save customer info
      const result = await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'customer@example.com',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.email).toBe('customer@example.com')
      expect(result.checkout.customerId).toBeDefined()

      // Verify in database
      const savedCheckout = await getCheckout(createResult.checkout.id)
      expect(savedCheckout.email).toBe('customer@example.com')
    })

    it('saves customer name with email', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const result = await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.email).toBe('john@example.com')
    })

    it('normalizes email to lowercase', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const result = await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'John.Doe@Example.COM',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.email).toBe('john.doe@example.com')
    })

    it('reuses existing customer for same email', async () => {
      // Create first checkout and save customer
      const { product, variant } = await seedProduct({ price: 50.0 })
      const checkout1 = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(checkout1.success).toBe(true)
      if (!checkout1.success) return

      const result1 = await saveCustomerInfo({
        checkoutId: checkout1.checkout.id,
        email: 'repeat@example.com',
      })
      expect(result1.success).toBe(true)
      if (!result1.success) return

      // Create second checkout with same email
      const checkout2 = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(checkout2.success).toBe(true)
      if (!checkout2.success) return

      const result2 = await saveCustomerInfo({
        checkoutId: checkout2.checkout.id,
        email: 'repeat@example.com',
      })
      expect(result2.success).toBe(true)
      if (!result2.success) return

      // Should reuse same customer ID
      expect(result2.checkout.customerId).toBe(result1.checkout.customerId)
    })
  })

  describe('Validation Errors', () => {
    it('rejects non-existent checkout', async () => {
      const result = await saveCustomerInfo({
        checkoutId: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout not found')
      expect(result.status).toBe(404)
    })

    it('rejects expired checkout', async () => {
      // Create an expired checkout using seedCheckout
      const expiredCheckout = await seedCheckout({
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      })

      const result = await saveCustomerInfo({
        checkoutId: expiredCheckout.id,
        email: 'test@example.com',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout expired')
      expect(result.status).toBe(410)
    })

    it('rejects completed checkout', async () => {
      // Create a completed checkout
      const completedCheckout = await seedCheckout({
        completedAt: new Date(),
      })

      const result = await saveCustomerInfo({
        checkoutId: completedCheckout.id,
        email: 'test@example.com',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout already completed')
      expect(result.status).toBe(410)
    })
  })

  describe('Email Updates', () => {
    it('allows updating email on same checkout', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // First email
      await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'first@example.com',
      })

      // Update email
      const result = await saveCustomerInfo({
        checkoutId: createResult.checkout.id,
        email: 'second@example.com',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.email).toBe('second@example.com')

      // Verify in database
      const savedCheckout = await getCheckout(createResult.checkout.id)
      expect(savedCheckout.email).toBe('second@example.com')
    })
  })
})
