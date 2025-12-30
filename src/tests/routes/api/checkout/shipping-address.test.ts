import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createCheckout,
  saveShippingAddress,
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
  address2: 'Apt 4B',
  city: 'New York',
  province: 'New York',
  provinceCode: 'NY',
  country: 'United States',
  countryCode: 'US',
  zip: '10001',
  phone: '+1234567890',
}

describe('saveShippingAddress', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Happy Path', () => {
    it('saves valid shipping address', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingAddress).toEqual(validAddress)

      // Verify in database
      const savedCheckout = await getCheckout(createResult.checkout.id)
      expect(savedCheckout.shippingAddress).toEqual(validAddress)
    })

    it('saves address without optional fields', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const minimalAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Oak Ave',
        city: 'Los Angeles',
        country: 'United States',
        countryCode: 'US',
        zip: '90001',
      }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: minimalAddress,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingAddress.firstName).toBe('Jane')
      expect(result.checkout.shippingAddress.city).toBe('Los Angeles')
    })

    it('allows updating shipping address', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      // First address
      await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: validAddress,
      })

      // Update address
      const newAddress = {
        ...validAddress,
        address1: '789 New Street',
        city: 'Chicago',
      }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: newAddress,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.shippingAddress.address1).toBe('789 New Street')
      expect(result.checkout.shippingAddress.city).toBe('Chicago')
    })
  })

  describe('Validation Errors', () => {
    it('rejects non-existent checkout', async () => {
      const result = await saveShippingAddress({
        checkoutId: '00000000-0000-0000-0000-000000000000',
        address: validAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout not found')
      expect(result.status).toBe(404)
    })

    it('rejects expired checkout', async () => {
      const expiredCheckout = await seedCheckout({
        expiresAt: new Date(Date.now() - 1000),
      })

      const result = await saveShippingAddress({
        checkoutId: expiredCheckout.id,
        address: validAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout expired')
      expect(result.status).toBe(410)
    })

    it('rejects completed checkout', async () => {
      const completedCheckout = await seedCheckout({
        completedAt: new Date(),
      })

      const result = await saveShippingAddress({
        checkoutId: completedCheckout.id,
        address: validAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBe('Checkout already completed')
      expect(result.status).toBe(410)
    })

    it('rejects missing firstName', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const invalidAddress = { ...validAddress, firstName: '' }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: invalidAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('firstName')
      expect(result.status).toBe(400)
    })

    it('rejects missing lastName', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const invalidAddress = { ...validAddress, lastName: '' }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: invalidAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('lastName')
    })

    it('rejects missing address1', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const invalidAddress = { ...validAddress, address1: '' }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: invalidAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('address1')
    })

    it('rejects missing city', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const invalidAddress = { ...validAddress, city: '' }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: invalidAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('city')
    })

    it('rejects missing zip', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const createResult = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })
      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const invalidAddress = { ...validAddress, zip: '' }

      const result = await saveShippingAddress({
        checkoutId: createResult.checkout.id,
        address: invalidAddress,
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('zip')
    })
  })
})
