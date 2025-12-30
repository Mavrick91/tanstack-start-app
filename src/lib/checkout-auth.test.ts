import { describe, expect, it, vi, beforeEach } from 'vitest'

// Set required env var before module loads
vi.stubEnv('CHECKOUT_SECRET', 'test-checkout-secret-key')

vi.mock('../db', () => {
  const mockLimit = vi.fn()
  const mockWhere = vi.fn(() => ({ limit: mockLimit }))
  const mockFrom = vi.fn(() => ({ where: mockWhere }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  return {
    db: {
      select: mockSelect,
      _mocks: { mockLimit, mockWhere, mockFrom, mockSelect },
    },
  }
})

import {
  validateCheckoutAccess,
  generateCheckoutToken,
  verifyCheckoutToken,
} from './checkout-auth'
import { db } from '../db'

const mocks = (
  db as typeof db & { _mocks: { mockLimit: ReturnType<typeof vi.fn> } }
)._mocks

describe('Checkout Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCheckoutToken', () => {
    it('should generate a token for a checkout ID', () => {
      const token = generateCheckoutToken('checkout-123')
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate different tokens for different checkout IDs', () => {
      const token1 = generateCheckoutToken('checkout-1')
      const token2 = generateCheckoutToken('checkout-2')
      expect(token1).not.toBe(token2)
    })

    it('should generate consistent tokens for the same checkout ID', () => {
      const token1 = generateCheckoutToken('checkout-123')
      const token2 = generateCheckoutToken('checkout-123')
      expect(token1).toBe(token2)
    })
  })

  describe('verifyCheckoutToken', () => {
    it('should verify a valid token', () => {
      const checkoutId = 'checkout-123'
      const token = generateCheckoutToken(checkoutId)
      expect(verifyCheckoutToken(checkoutId, token)).toBe(true)
    })

    it('should reject an invalid token', () => {
      const checkoutId = 'checkout-123'
      expect(verifyCheckoutToken(checkoutId, 'invalid-token')).toBe(false)
    })

    it('should reject token for different checkout', () => {
      const token = generateCheckoutToken('checkout-1')
      expect(verifyCheckoutToken('checkout-2', token)).toBe(false)
    })
  })

  describe('validateCheckoutAccess', () => {
    it('should return error when checkout not found', async () => {
      mocks.mockLimit.mockResolvedValue([])

      const request = new Request('http://localhost')
      const result = await validateCheckoutAccess('nonexistent', request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Checkout not found')
    })

    it('should return error when checkout is completed', async () => {
      mocks.mockLimit.mockResolvedValue([
        {
          id: 'checkout-123',
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          customerId: null,
        },
      ])

      const request = new Request('http://localhost')
      const result = await validateCheckoutAccess('checkout-123', request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Checkout already completed')
    })

    it('should return error when checkout is expired', async () => {
      mocks.mockLimit.mockResolvedValue([
        {
          id: 'checkout-123',
          completedAt: null,
          expiresAt: new Date(Date.now() - 3600000),
          customerId: null,
        },
      ])

      const request = new Request('http://localhost')
      const result = await validateCheckoutAccess('checkout-123', request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Checkout expired')
    })

    it('should allow access with valid session token for guest checkout', async () => {
      const checkoutId = 'checkout-123'
      const token = generateCheckoutToken(checkoutId)

      mocks.mockLimit.mockResolvedValue([
        {
          id: checkoutId,
          completedAt: null,
          expiresAt: new Date(Date.now() + 3600000),
          customerId: null,
        },
      ])

      const request = new Request('http://localhost', {
        headers: { Cookie: `checkout_session=${token}` },
      })
      const result = await validateCheckoutAccess(checkoutId, request)

      expect(result.valid).toBe(true)
      expect(result.checkout).toBeDefined()
    })

    it('should reject access with invalid session token for guest checkout', async () => {
      mocks.mockLimit.mockResolvedValue([
        {
          id: 'checkout-123',
          completedAt: null,
          expiresAt: new Date(Date.now() + 3600000),
          customerId: null,
        },
      ])

      const request = new Request('http://localhost', {
        headers: { Cookie: 'checkout_session=invalid-token' },
      })
      const result = await validateCheckoutAccess('checkout-123', request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid session token')
    })

    it('should reject access for guest checkout without session token', async () => {
      const checkoutId = 'checkout-123'

      mocks.mockLimit.mockResolvedValue([
        {
          id: checkoutId,
          completedAt: null,
          expiresAt: new Date(Date.now() + 3600000),
          customerId: null,
        },
      ])

      const request = new Request('http://localhost')
      const result = await validateCheckoutAccess(checkoutId, request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Session token required')
    })

    it('should allow access for authenticated checkout with customerId', async () => {
      const checkoutId = 'checkout-123'

      mocks.mockLimit.mockResolvedValue([
        {
          id: checkoutId,
          completedAt: null,
          expiresAt: new Date(Date.now() + 3600000),
          customerId: 'customer-456',
        },
      ])

      const request = new Request('http://localhost')
      const result = await validateCheckoutAccess(checkoutId, request)

      expect(result.valid).toBe(true)
      expect(result.checkout).toBeDefined()
    })
  })
})
