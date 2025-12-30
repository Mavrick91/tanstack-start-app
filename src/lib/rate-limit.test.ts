import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the database
vi.mock('../db', () => {
  const mockReturning = vi.fn()
  const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }))
  const mockValues = vi.fn(() => ({
    onConflictDoUpdate: mockOnConflictDoUpdate,
  }))
  const mockInsert = vi.fn(() => ({ values: mockValues }))
  const mockDeleteWhere = vi.fn()
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

  return {
    db: {
      insert: mockInsert,
      delete: mockDelete,
      _mocks: {
        mockReturning,
        mockOnConflictDoUpdate,
        mockValues,
        mockInsert,
        mockDeleteWhere,
        mockDelete,
      },
    },
  }
})

import { checkRateLimit, getRateLimitKey } from './rate-limit'
import { db } from '../db'

const mocks = (
  db as typeof db & {
    _mocks: {
      mockReturning: ReturnType<typeof vi.fn>
    }
  }
)._mocks

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRateLimitKey', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      const key = getRateLimitKey(request)
      expect(key).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header if x-forwarded-for is missing', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })
      const key = getRateLimitKey(request)
      expect(key).toBe('192.168.1.2')
    })

    it('should return unknown if no IP headers present', () => {
      const request = new Request('http://localhost')
      const key = getRateLimitKey(request)
      expect(key).toBe('unknown')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      })
      const key = getRateLimitKey(request)
      expect(key).toBe('192.168.1.1')
    })
  })

  describe('checkRateLimit', () => {
    describe('auth limiter', () => {
      it('should allow requests within limit', async () => {
        const expiresAt = new Date(Date.now() + 900000) // 15 minutes
        mocks.mockReturning.mockResolvedValue([{ points: 1, expiresAt }])

        const result = await checkRateLimit('auth', 'test-key')

        expect(result.allowed).toBe(true)
      })

      it('should block requests exceeding limit', async () => {
        const expiresAt = new Date(Date.now() + 900000)
        mocks.mockReturning.mockResolvedValue([{ points: 6, expiresAt }])

        const result = await checkRateLimit('auth', 'test-key')

        expect(result.allowed).toBe(false)
        expect(result.retryAfter).toBeGreaterThan(0)
      })
    })

    describe('api limiter', () => {
      it('should allow requests within limit', async () => {
        const expiresAt = new Date(Date.now() + 60000)
        mocks.mockReturning.mockResolvedValue([{ points: 50, expiresAt }])

        const result = await checkRateLimit('api', 'test-key')

        expect(result.allowed).toBe(true)
      })

      it('should block requests exceeding limit', async () => {
        const expiresAt = new Date(Date.now() + 60000)
        mocks.mockReturning.mockResolvedValue([{ points: 101, expiresAt }])

        const result = await checkRateLimit('api', 'test-key')

        expect(result.allowed).toBe(false)
      })
    })

    describe('webhook limiter', () => {
      it('should allow requests within limit', async () => {
        const expiresAt = new Date(Date.now() + 60000)
        mocks.mockReturning.mockResolvedValue([{ points: 25, expiresAt }])

        const result = await checkRateLimit('webhook', 'test-key')

        expect(result.allowed).toBe(true)
      })

      it('should block requests exceeding limit', async () => {
        const expiresAt = new Date(Date.now() + 60000)
        mocks.mockReturning.mockResolvedValue([{ points: 51, expiresAt }])

        const result = await checkRateLimit('webhook', 'test-key')

        expect(result.allowed).toBe(false)
      })
    })

    it('should fail open on database error', async () => {
      mocks.mockReturning.mockRejectedValue(new Error('Database error'))

      const result = await checkRateLimit('auth', 'test-key')

      expect(result.allowed).toBe(true)
    })
  })
})
