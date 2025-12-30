import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createCheckout,
  saveShippingAddress,
  saveShippingMethod,
} from '../../../../server/checkout'
import {
  cleanupTestData,
  resetTestIds,
  seedProduct,
  seedCheckout,
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

describe('saveShippingMethod', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Happy Path', () => {
    it('saves standard shipping method', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Add shipping address first (required)
      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      // Save shipping method
      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingRateId).toBe('standard')
      expect(result.checkout.shippingMethod).toBe('Standard Shipping')
      expect(result.checkout.shippingTotal).toBe(5.99)

      // Verify in database
      const savedCheckout = await getCheckout(createResult.checkout.id)
      expect(savedCheckout.shippingRateId).toBe('standard')
      expect(savedCheckout.shippingMethod).toBe('Standard Shipping')
    })

    it('saves express shipping method', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'express',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingRateId).toBe('express')
      expect(result.checkout.shippingMethod).toBe('Express Shipping')
      expect(result.checkout.shippingTotal).toBe(14.99)
    })

    it('recalculates total with shipping', async () => {
      const { product, variant } = await seedProduct({ price: 100.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Total should include subtotal + tax + shipping
      expect(result.checkout.shippingTotal).toBe(5.99)
      expect(result.checkout.total).toBeGreaterThan(100 + 5.99) // subtotal + shipping + some tax
    })

    it('allows changing shipping method', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      // Select standard first
      await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'standard',
      })

      // Change to express
      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'express',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingRateId).toBe('express')
      expect(result.checkout.shippingTotal).toBe(14.99)
    })
  })

  describe('Validation Errors', () => {
    it('rejects non-existent checkout', async () => {
      const result = await saveShippingMethod({
        checkoutId: '00000000-0000-0000-0000-000000000000',
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout not found')
      expect(result.status).toBe(404)
    })

    it('rejects completed checkout', async () => {
      const completedCheckout = await seedCheckout({
        completedAt: new Date(),
        shippingAddress: validAddress,
      })

      const result = await saveShippingMethod({
        checkoutId: completedCheckout.id,
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout already completed')
      expect(result.status).toBe(410)
    })

    it('rejects if shipping address not set', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // Try to set shipping method without address
      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Shipping address required first')
      expect(result.status).toBe(400)
    })

    it('rejects invalid shipping rate ID', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      const result = await saveShippingMethod({
        checkoutId: createResult.checkout.id,
        shippingRateId: 'invalid-rate',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Invalid shipping rate')
      expect(result.status).toBe(400)
    })
  })
})
