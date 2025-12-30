import { describe, expect, it, beforeEach } from 'vitest'

import { checkRateLimit, getRateLimitKey, resetRateLimiter } from './rate-limit'

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await resetRateLimiter('auth')
    await resetRateLimiter('api')
    await resetRateLimiter('webhook')
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
        const key = 'test-auth-1'

        for (let i = 0; i < 5; i++) {
          const result = await checkRateLimit('auth', key)
          expect(result.allowed).toBe(true)
        }
      })

      it('should block requests exceeding limit', async () => {
        const key = 'test-auth-2'

        // Use up all 5 attempts
        for (let i = 0; i < 5; i++) {
          await checkRateLimit('auth', key)
        }

        // 6th attempt should be blocked
        const result = await checkRateLimit('auth', key)
        expect(result.allowed).toBe(false)
        expect(result.retryAfter).toBeGreaterThan(0)
      })
    })

    describe('api limiter', () => {
      it('should allow requests within limit', async () => {
        const key = 'test-api-1'

        for (let i = 0; i < 100; i++) {
          const result = await checkRateLimit('api', key)
          expect(result.allowed).toBe(true)
        }
      })

      it('should block requests exceeding limit', async () => {
        const key = 'test-api-2'

        // Use up all 100 requests
        for (let i = 0; i < 100; i++) {
          await checkRateLimit('api', key)
        }

        // 101st request should be blocked
        const result = await checkRateLimit('api', key)
        expect(result.allowed).toBe(false)
      })
    })

    describe('webhook limiter', () => {
      it('should allow requests within limit', async () => {
        const key = 'test-webhook-1'

        for (let i = 0; i < 50; i++) {
          const result = await checkRateLimit('webhook', key)
          expect(result.allowed).toBe(true)
        }
      })

      it('should block requests exceeding limit', async () => {
        const key = 'test-webhook-2'

        // Use up all 50 requests
        for (let i = 0; i < 50; i++) {
          await checkRateLimit('webhook', key)
        }

        // 51st request should be blocked
        const result = await checkRateLimit('webhook', key)
        expect(result.allowed).toBe(false)
      })
    })

    it('should track different keys separately', async () => {
      const key1 = 'test-separate-1'
      const key2 = 'test-separate-2'

      // Use up all attempts for key1
      for (let i = 0; i < 5; i++) {
        await checkRateLimit('auth', key1)
      }

      // key1 should be blocked
      const result1 = await checkRateLimit('auth', key1)
      expect(result1.allowed).toBe(false)

      // key2 should still be allowed
      const result2 = await checkRateLimit('auth', key2)
      expect(result2.allowed).toBe(true)
    })
  })
})
