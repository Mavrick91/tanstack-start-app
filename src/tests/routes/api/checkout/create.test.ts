import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createCheckout } from '../../../../server/checkout'
import {
  cleanupTestData,
  resetTestIds,
  seedProduct,
  seedProductWithImage,
  getCheckout,
} from '../../../../test/helpers/db-test'

describe('createCheckout', () => {
  beforeEach(() => {
    resetTestIds()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Happy Path', () => {
    it('creates checkout with valid cart items', async () => {
      // Seed a product with variant
      const { product, variant } = await seedProduct({
        name: 'Test Nail Set',
        price: 49.99,
      })

      // Call service
      const result = await createCheckout({
        items: [
          {
            productId: product.id,
            variantId: variant.id,
            quantity: 2,
          },
        ],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.id).toBeDefined()
      expect(result.checkout.cartItems).toHaveLength(1)
      expect(result.checkout.cartItems[0].productId).toBe(product.id)
      expect(result.checkout.cartItems[0].variantId).toBe(variant.id)
      expect(result.checkout.cartItems[0].quantity).toBe(2)
      expect(result.checkout.cartItems[0].price).toBe(49.99)

      // Verify checkout was created in database
      const savedCheckout = await getCheckout(result.checkout.id)
      expect(savedCheckout).toBeDefined()
      expect(savedCheckout.total).toBeDefined()
    })

    it('creates checkout without specifying variant (uses first variant)', async () => {
      const { product, variant } = await seedProduct({
        name: 'Auto Variant Product',
        price: 29.99,
      })

      const result = await createCheckout({
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.cartItems[0].variantId).toBe(variant.id)
    })

    it('includes product image URL when available', async () => {
      const { product, variant } = await seedProductWithImage({
        name: 'Product With Image',
        price: 39.99,
      })

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.cartItems[0].imageUrl).toContain('example.com')
    })
  })

  describe('Totals Calculation', () => {
    it('calculates subtotal correctly for multiple items', async () => {
      const { product: product1, variant: variant1 } = await seedProduct({
        name: 'Product 1',
        price: 25.0,
      })
      const { product: product2, variant: variant2 } = await seedProduct({
        name: 'Product 2',
        price: 15.5,
      })

      const result = await createCheckout({
        items: [
          { productId: product1.id, variantId: variant1.id, quantity: 2 }, // 50.00
          { productId: product2.id, variantId: variant2.id, quantity: 3 }, // 46.50
        ],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.subtotal).toBe(96.5)
    })

    it('includes tax in total', async () => {
      const { product, variant } = await seedProduct({
        name: 'Taxable Product',
        price: 100.0,
      })

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.subtotal).toBe(100.0)
      expect(result.checkout.taxTotal).toBeGreaterThan(0)
      expect(result.checkout.total).toBeGreaterThan(result.checkout.subtotal)
    })

    it('calculates correct total with quantity > 1', async () => {
      const { product, variant } = await seedProduct({
        name: 'Quantity Test',
        price: 10.0,
      })

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 5 }],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.subtotal).toBe(50.0)
    })
  })

  describe('Validation Errors', () => {
    it('rejects empty cart', async () => {
      const result = await createCheckout({ items: [] })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('Cart items are required')
      expect(result.status).toBe(400)
    })

    it('rejects invalid product ID', async () => {
      const result = await createCheckout({
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            quantity: 1,
          },
        ],
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('Product not found')
      expect(result.status).toBe(404)
    })

    it('rejects invalid variant ID', async () => {
      const { product } = await seedProduct({ name: 'Valid Product' })

      const result = await createCheckout({
        items: [
          {
            productId: product.id,
            variantId: '00000000-0000-0000-0000-000000000000',
            quantity: 1,
          },
        ],
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('Variant not found')
    })
  })

  describe('Currency', () => {
    it('uses USD as default currency', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.currency).toBe('USD')
    })

    it('accepts custom currency', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
        currency: 'EUR',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.checkout.currency).toBe('EUR')
    })
  })

  describe('Expiration', () => {
    it('sets expiration to 24 hours from now', async () => {
      const { product, variant } = await seedProduct({ price: 50.0 })
      const before = Date.now()

      const result = await createCheckout({
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      const after = Date.now()
      const expiresAt = result.checkout.expiresAt.getTime()

      // Should be approximately 24 hours from now
      const expectedMin = before + 24 * 60 * 60 * 1000 - 1000
      const expectedMax = after + 24 * 60 * 60 * 1000 + 1000

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin)
      expect(expiresAt).toBeLessThanOrEqual(expectedMax)
    })
  })
})
