import { vi } from 'vitest'

/**
 * Creates a mock cart hook return value.
 *
 * Usage:
 * ```ts
 * const mockCart = createMockCart({ items: [createCartItem()], itemCount: 1 })
 * vi.mock('@/hooks/useCart', () => ({ useCart: () => mockCart }))
 *
 * // Later in test:
 * expect(mockCart.removeItem).toHaveBeenCalledWith('item-id')
 * ```
 */
export const createMockCart = (overrides: Record<string, unknown> = {}) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  isLoading: false,
  ...overrides,
})

/**
 * Creates a mock auth hook return value.
 *
 * Usage:
 * ```ts
 * const mockAuth = createMockAuth({ user: createUser(), isAuthenticated: true })
 * vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }))
 * ```
 */
export const createMockAuth = (overrides: Record<string, unknown> = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  ...overrides,
})

/**
 * Creates a mock checkout hook return value.
 *
 * Usage:
 * ```ts
 * const mockCheckout = createMockCheckout({ step: 'shipping' })
 * vi.mock('@/hooks/useCheckout', () => ({ useCheckout: () => mockCheckout }))
 * ```
 */
export const createMockCheckout = (
  overrides: Record<string, unknown> = {},
) => ({
  checkoutId: null,
  step: 'information',
  isLoading: false,
  error: null,
  shippingAddress: null,
  shippingMethod: null,
  paymentMethod: null,
  setShippingAddress: vi.fn(),
  setShippingMethod: vi.fn(),
  setPaymentMethod: vi.fn(),
  createCheckout: vi.fn(),
  completeCheckout: vi.fn(),
  ...overrides,
})
