/**
 * Test data factories for creating consistent mock data across tests.
 * Each factory generates unique IDs to prevent test pollution.
 */

let idCounter = 0

/**
 * Generates a unique ID with the given prefix.
 * Counter resets between tests via resetFactories().
 */
const uniqueId = (prefix: string) => `${prefix}-${++idCounter}`

/**
 * Resets the ID counter. Called automatically in setup.ts afterEach.
 */
export const resetFactories = () => {
  idCounter = 0
}

// =============================================================================
// Product Factories
// =============================================================================

/**
 * Creates a mock product.
 *
 * Usage:
 * ```ts
 * const product = createProduct()
 * const premium = createProduct({ price: 999.99, name: { en: 'Premium' } })
 * ```
 */
export const createProduct = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('product'),
  name: { en: 'Test Product', fr: 'Produit Test', id: 'Produk Tes' },
  slug: `test-product-${idCounter}`,
  description: {
    en: 'A test product description',
    fr: 'Une description de produit test',
    id: 'Deskripsi produk tes',
  },
  price: 99.99,
  compareAtPrice: null,
  images: [],
  variants: [],
  options: [],
  isActive: true,
  status: 'active' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

/**
 * Creates a mock product variant.
 */
export const createProductVariant = (
  overrides: Record<string, unknown> = {},
) => ({
  id: uniqueId('variant'),
  productId: uniqueId('product'),
  sku: `SKU-${idCounter}`,
  price: 99.99,
  compareAtPrice: null,
  inventory: 100,
  options: {},
  isActive: true,
  createdAt: new Date('2024-01-01'),
  ...overrides,
})

/**
 * Creates a mock product image.
 */
export const createProductImage = (
  overrides: Record<string, unknown> = {},
) => ({
  id: uniqueId('image'),
  productId: uniqueId('product'),
  url: `https://example.com/image-${idCounter}.jpg`,
  alt: { en: 'Product image', fr: 'Image du produit', id: 'Gambar produk' },
  position: 0,
  ...overrides,
})

// =============================================================================
// Cart Factories
// =============================================================================

/**
 * Creates a mock cart item.
 *
 * Usage:
 * ```ts
 * const item = createCartItem()
 * const multiple = createCartItem({ quantity: 3 })
 * ```
 */
export const createCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('cart-item'),
  productId: uniqueId('product'),
  variantId: null,
  name: 'Test Product',
  price: 99.99,
  quantity: 1,
  image: null,
  ...overrides,
})

// =============================================================================
// User Factories
// =============================================================================

/**
 * Creates a mock user.
 *
 * Usage:
 * ```ts
 * const user = createUser()
 * const admin = createUser({ role: 'admin' })
 * ```
 */
export const createUser = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('user'),
  email: `user-${idCounter}@test.com`,
  name: 'Test User',
  role: 'customer' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

/**
 * Creates a mock admin user.
 */
export const createAdminUser = (overrides: Record<string, unknown> = {}) =>
  createUser({ role: 'admin', ...overrides })

// =============================================================================
// Address Factories
// =============================================================================

/**
 * Creates a mock address.
 */
export const createAddress = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('address'),
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Test Street',
  address2: null,
  city: 'Test City',
  state: 'TS',
  postalCode: '12345',
  country: 'US',
  phone: '+1234567890',
  ...overrides,
})

// =============================================================================
// Order Factories
// =============================================================================

/**
 * Creates a mock order.
 */
export const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('order'),
  orderNumber: `ORD-${idCounter.toString().padStart(6, '0')}`,
  customerId: uniqueId('customer'),
  status: 'pending' as const,
  subtotal: 99.99,
  tax: 8.0,
  shipping: 5.99,
  total: 113.98,
  shippingAddress: createAddress(),
  billingAddress: createAddress(),
  items: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

/**
 * Creates a mock order item.
 */
export const createOrderItem = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('order-item'),
  orderId: uniqueId('order'),
  productId: uniqueId('product'),
  variantId: null,
  name: 'Test Product',
  price: 99.99,
  quantity: 1,
  ...overrides,
})

// =============================================================================
// Collection Factories
// =============================================================================

/**
 * Creates a mock collection.
 */
export const createCollection = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('collection'),
  title: { en: 'Test Collection', fr: 'Collection Test', id: 'Koleksi Tes' },
  slug: `test-collection-${idCounter}`,
  description: {
    en: 'A test collection',
    fr: 'Une collection test',
    id: 'Koleksi tes',
  },
  image: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

// =============================================================================
// Checkout Factories
// =============================================================================

/**
 * Creates a mock checkout.
 */
export const createCheckout = (overrides: Record<string, unknown> = {}) => ({
  id: uniqueId('checkout'),
  email: `checkout-${idCounter}@test.com`,
  items: [createCartItem()],
  shippingAddress: null,
  billingAddress: null,
  shippingMethod: null,
  subtotal: 99.99,
  tax: 0,
  shipping: 0,
  total: 99.99,
  status: 'pending' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

/**
 * Creates a mock shipping rate.
 */
export const createShippingRate = (
  overrides: Record<string, unknown> = {},
) => ({
  id: uniqueId('shipping-rate'),
  name: 'Standard Shipping',
  price: 5.99,
  estimatedDays: '3-5',
  ...overrides,
})
