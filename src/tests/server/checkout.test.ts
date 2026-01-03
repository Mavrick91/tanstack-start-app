import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies BEFORE importing
vi.mock('../../db', () => ({
  db: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
  asc: vi.fn(),
}))

vi.mock('../../db/schema', () => ({
  checkouts: { id: 'checkouts' },
  products: { id: 'products' },
  productVariants: { id: 'productVariants' },
  productImages: { id: 'productImages' },
  customers: { id: 'customers' },
  orders: { id: 'orders' },
  orderItems: { id: 'orderItems' },
}))

vi.mock('../../lib/tax', () => ({
  calculateTax: vi.fn(
    (subtotal: number) => Math.round(subtotal * 0.1 * 100) / 100,
  ),
}))

vi.mock('../../lib/validation', () => ({
  normalizeEmail: vi.fn((email: string) => email.toLowerCase().trim()),
}))

import {
  createCheckout,
  saveCustomerInfo,
  saveShippingAddress,
  saveShippingMethod,
  completeCheckout,
} from '../../server/checkout'

/**
 * Creates a mock database for testing
 */
const createMockDb = (options: {
  products?: Array<{ id: string; name: { en: string } }>
  variants?: Array<{
    id: string
    productId: string
    title: string
    price: string
    sku?: string
  }>
  images?: Array<{ productId: string; url: string; position: number }>
  checkout?: {
    id: string
    email?: string
    customerId?: string | null
    cartItems: unknown
    subtotal: string
    shippingTotal: string
    taxTotal: string
    total: string
    currency: string
    shippingAddress?: unknown
    billingAddress?: unknown
    shippingRateId?: string | null
    shippingMethod?: string | null
    completedAt?: Date | null
    expiresAt: Date
  } | null
  customer?: { id: string; email: string } | null
  insertCheckoutResult?: unknown
  insertCustomerResult?: unknown
  updateCheckoutResult?: unknown
  insertOrderResult?: unknown
}) => {
  const mockSelect = vi.fn().mockImplementation(() => {
    return {
      from: vi.fn().mockImplementation((table) => {
        const tableId = table?.id
        if (tableId === 'products') {
          return {
            where: vi.fn().mockResolvedValue(options.products || []),
          }
        }
        if (tableId === 'productVariants') {
          return {
            where: vi.fn().mockImplementation(() => {
              // Create a thenable that resolves to variants
              const variantsPromise = Promise.resolve(options.variants || [])
              // Add orderBy method that also returns variants
              const result = Object.assign(variantsPromise, {
                orderBy: vi.fn().mockResolvedValue(options.variants || []),
              })
              return result
            }),
          }
        }
        if (tableId === 'productImages') {
          return {
            where: vi.fn().mockImplementation(() => {
              // Create a thenable that resolves to images
              const imagesPromise = Promise.resolve(options.images || [])
              // Add orderBy method that also returns images
              const result = Object.assign(imagesPromise, {
                orderBy: vi.fn().mockResolvedValue(options.images || []),
              })
              return result
            }),
          }
        }
        if (tableId === 'checkouts') {
          return {
            where: vi.fn().mockImplementation(() => {
              return {
                limit: vi
                  .fn()
                  .mockResolvedValue(
                    options.checkout ? [options.checkout] : [],
                  ),
              }
            }),
          }
        }
        if (tableId === 'customers') {
          return {
            where: vi.fn().mockImplementation(() => {
              return {
                limit: vi
                  .fn()
                  .mockResolvedValue(
                    options.customer ? [options.customer] : [],
                  ),
              }
            }),
          }
        }
        return {
          where: vi.fn().mockResolvedValue([]),
        }
      }),
    }
  })

  const mockInsert = vi.fn().mockImplementation((table) => {
    const tableId = table?.id
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(async () => {
          if (tableId === 'checkouts' && options.insertCheckoutResult) {
            return [options.insertCheckoutResult]
          }
          if (tableId === 'customers' && options.insertCustomerResult) {
            return [options.insertCustomerResult]
          }
          if (tableId === 'orders' && options.insertOrderResult) {
            return [options.insertOrderResult]
          }
          // Default checkout insert
          if (tableId === 'checkouts') {
            return [
              {
                id: 'checkout-new',
                cartItems: [],
                subtotal: '0',
                shippingTotal: '0',
                taxTotal: '0',
                total: '0',
                currency: 'USD',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            ]
          }
          return []
        }),
      }),
    }
  })

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue(
            options.updateCheckoutResult ? [options.updateCheckoutResult] : [],
          ),
      }),
    }),
  })

  const mockTransaction = vi.fn().mockImplementation(async (callback) => {
    const tx = {
      insert: mockInsert,
      update: mockUpdate,
    }
    return callback(tx)
  })

  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  }
}

describe('Server Checkout Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCheckout', () => {
    it('should create checkout with valid cart items', async () => {
      const mockDb = createMockDb({
        products: [{ id: 'prod-1', name: { en: 'Test Product' } }],
        variants: [
          {
            id: 'var-1',
            productId: 'prod-1',
            title: 'Default Title',
            price: '29.99',
          },
        ],
        images: [{ productId: 'prod-1', url: '/image.jpg', position: 0 }],
        insertCheckoutResult: {
          id: 'checkout-123',
          cartItems: [
            {
              productId: 'prod-1',
              variantId: 'var-1',
              quantity: 2,
              title: 'Test Product',
              price: 29.99,
              imageUrl: '/image.jpg',
            },
          ],
          subtotal: '59.98',
          shippingTotal: '5.99',
          taxTotal: '6.00',
          total: '71.97',
          currency: 'USD',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      // Mock getDbContext
      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await createCheckout({
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 2 }],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.id).toBe('checkout-123')
        expect(result.checkout?.cartItems).toHaveLength(1)
        expect(result.checkout?.subtotal).toBe(59.98)
      }
    })

    it('should return error when cart items are empty', async () => {
      const result = await createCheckout({ items: [] })

      expect(result).toEqual({
        success: false,
        error: 'Cart items are required',
        status: 400,
      })
    })

    it('should return error when cart items are not an array', async () => {
      const result = await createCheckout({ items: null as unknown as [] })

      expect(result).toEqual({
        success: false,
        error: 'Cart items are required',
        status: 400,
      })
    })

    it('should return error when product not found', async () => {
      const mockDb = createMockDb({
        products: [], // No products
        variants: [],
        images: [],
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await createCheckout({
        items: [{ productId: 'invalid-id', variantId: 'var-1', quantity: 1 }],
      })

      expect(result).toEqual({
        success: false,
        error: 'Product not found: invalid-id',
        status: 404,
      })
    })

    it('should return error when variant not found', async () => {
      const mockDb = createMockDb({
        products: [{ id: 'prod-1', name: { en: 'Test Product' } }],
        variants: [], // No variants
        images: [],
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await createCheckout({
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 1 }],
      })

      expect(result).toEqual({
        success: false,
        error: 'Variant not found for product: prod-1',
        status: 404,
      })
    })

    it('should apply free shipping when subtotal meets threshold', async () => {
      const mockDb = createMockDb({
        products: [{ id: 'prod-1', name: { en: 'Expensive Product' } }],
        variants: [
          {
            id: 'var-1',
            productId: 'prod-1',
            title: 'Default Title',
            price: '80.00',
          },
        ],
        images: [],
        insertCheckoutResult: {
          id: 'checkout-123',
          cartItems: [
            {
              productId: 'prod-1',
              variantId: 'var-1',
              quantity: 1,
              title: 'Expensive Product',
              price: 80.0,
            },
          ],
          subtotal: '80.00',
          shippingTotal: '0.00', // Free shipping
          taxTotal: '8.00',
          total: '88.00',
          currency: 'USD',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await createCheckout({
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 1 }],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.shippingTotal).toBe(0)
      }
    })
  })

  describe('saveCustomerInfo', () => {
    it('should save customer email to existing checkout', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          customerId: null,
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
        },
        customer: null, // No existing customer
        insertCustomerResult: {
          id: 'customer-new',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        updateCheckoutResult: {
          id: 'checkout-123',
          email: 'test@example.com',
          customerId: 'customer-new',
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveCustomerInfo({
        checkoutId: 'checkout-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.email).toBe('test@example.com')
        expect(result.checkout?.customerId).toBe('customer-new')
      }
    })

    it('should return error when checkout not found', async () => {
      const mockDb = createMockDb({
        checkout: null,
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveCustomerInfo({
        checkoutId: 'invalid-id',
        email: 'test@example.com',
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('should return error when checkout is already completed', async () => {
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: new Date(), // Already completed
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveCustomerInfo({
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout already completed',
        status: 410,
      })
    })

    it('should return error when checkout is expired', async () => {
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveCustomerInfo({
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout expired',
        status: 410,
      })
    })

    it('should use existing customer when email matches', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          customerId: null,
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
        },
        customer: {
          id: 'customer-existing',
          email: 'test@example.com',
        },
        updateCheckoutResult: {
          id: 'checkout-123',
          email: 'test@example.com',
          customerId: 'customer-existing',
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveCustomerInfo({
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.customerId).toBe('customer-existing')
      }
    })
  })

  describe('saveShippingAddress', () => {
    const validAddress = {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      country: 'United States',
      countryCode: 'US',
      zip: '10001',
    }

    it('should save shipping address to checkout', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
        },
        updateCheckoutResult: {
          id: 'checkout-123',
          shippingAddress: validAddress,
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingAddress({
        checkoutId: 'checkout-123',
        address: validAddress,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.shippingAddress).toEqual(validAddress)
      }
    })

    it('should return error when checkout not found', async () => {
      const mockDb = createMockDb({
        checkout: null,
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingAddress({
        checkoutId: 'invalid-id',
        address: validAddress,
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('should return error when required field is missing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const invalidAddress = { ...validAddress, firstName: '' }

      const result = await saveShippingAddress({
        checkoutId: 'checkout-123',
        address: invalidAddress,
      })

      expect(result).toEqual({
        success: false,
        error: 'Missing required field: firstName',
        status: 400,
      })
    })
  })

  describe('saveShippingMethod', () => {
    it('should save shipping method to checkout', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            country: 'United States',
            countryCode: 'US',
            zip: '10001',
          },
        },
        updateCheckoutResult: {
          id: 'checkout-123',
          shippingRateId: 'standard',
          shippingMethod: 'Standard Shipping',
          shippingTotal: '5.99',
          total: '60.99',
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingMethod({
        checkoutId: 'checkout-123',
        shippingRateId: 'standard',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.checkout?.shippingRateId).toBe('standard')
        expect(result.checkout?.shippingMethod).toBe('Standard Shipping')
      }
    })

    it('should return error when checkout not found', async () => {
      const mockDb = createMockDb({
        checkout: null,
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingMethod({
        checkoutId: 'invalid-id',
        shippingRateId: 'standard',
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('should return error when shipping address is missing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: undefined, // No address
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingMethod({
        checkoutId: 'checkout-123',
        shippingRateId: 'standard',
      })

      expect(result).toEqual({
        success: false,
        error: 'Shipping address required first',
        status: 400,
      })
    })

    it('should return error for invalid shipping rate', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            country: 'United States',
            countryCode: 'US',
            zip: '10001',
          },
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await saveShippingMethod({
        checkoutId: 'checkout-123',
        shippingRateId: 'invalid-rate',
      })

      expect(result).toEqual({
        success: false,
        error: 'Invalid shipping rate',
        status: 400,
      })
    })
  })

  describe('completeCheckout', () => {
    it('should complete checkout and create order', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          email: 'test@example.com',
          customerId: 'customer-1',
          cartItems: [
            {
              productId: 'prod-1',
              variantId: 'var-1',
              quantity: 2,
              title: 'Test Product',
              price: 29.99,
            },
          ],
          subtotal: '59.98',
          shippingTotal: '5.99',
          taxTotal: '6.00',
          total: '71.97',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            country: 'United States',
            countryCode: 'US',
            zip: '10001',
          },
          shippingRateId: 'standard',
          shippingMethod: 'Standard Shipping',
        },
        insertOrderResult: {
          id: 'order-123',
          orderNumber: 1001,
          email: 'test@example.com',
          total: '71.97',
        },
      })

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const tx = {
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'order-123',
                  orderNumber: 1001,
                  email: 'test@example.com',
                  total: '71.97',
                },
              ]),
            }),
          })),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        }
        return callback(tx)
      })

      mockDb.transaction = mockTransaction

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await completeCheckout({
        checkoutId: 'checkout-123',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.order?.id).toBe('order-123')
        expect(result.order?.orderNumber).toBe(1001)
        expect(result.order?.email).toBe('test@example.com')
      }
    })

    it('should return error when checkout not found', async () => {
      const mockDb = createMockDb({
        checkout: null,
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await completeCheckout({
        checkoutId: 'invalid-id',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })

      expect(result).toEqual({
        success: false,
        error: 'Checkout not found',
        status: 404,
      })
    })

    it('should return error when email is missing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          email: undefined, // No email
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await completeCheckout({
        checkoutId: 'checkout-123',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })

      expect(result).toEqual({
        success: false,
        error: 'Customer email required',
        status: 400,
      })
    })

    it('should return error when shipping address is missing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          email: 'test@example.com',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: undefined, // No address
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await completeCheckout({
        checkoutId: 'checkout-123',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })

      expect(result).toEqual({
        success: false,
        error: 'Shipping address required',
        status: 400,
      })
    })

    it('should return error when shipping method is missing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockDb = createMockDb({
        checkout: {
          id: 'checkout-123',
          email: 'test@example.com',
          cartItems: [],
          subtotal: '50.00',
          shippingTotal: '5.99',
          taxTotal: '5.00',
          total: '60.99',
          currency: 'USD',
          completedAt: null,
          expiresAt: futureDate,
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main St',
            city: 'New York',
            country: 'United States',
            countryCode: 'US',
            zip: '10001',
          },
          shippingRateId: null, // No shipping method
        },
      })

      vi.doMock('../../db', () => ({ db: mockDb }))

      const result = await completeCheckout({
        checkoutId: 'checkout-123',
        paymentProvider: 'stripe',
        paymentId: 'pi_123',
      })

      expect(result).toEqual({
        success: false,
        error: 'Shipping method required',
        status: 400,
      })
    })
  })
})
