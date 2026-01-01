import { describe, it, expect } from 'vitest'

import { generateToken, hashToken, generateExpiresAt } from './tokens'

describe('tokens', () => {
  describe('generateToken', () => {
    it('generates a 64-character hex string', () => {
      const token = generateToken()
      expect(token).toHaveLength(64)
      expect(token).toMatch(/^[a-f0-9]+$/)
    })

    it('generates unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashToken', () => {
    it('returns a 64-character hex string', () => {
      const hash = hashToken('test-token')
      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('returns consistent hash for same input', () => {
      const hash1 = hashToken('test-token')
      const hash2 = hashToken('test-token')
      expect(hash1).toBe(hash2)
    })

    it('returns different hash for different input', () => {
      const hash1 = hashToken('token-1')
      const hash2 = hashToken('token-2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateExpiresAt', () => {
    it('generates date 24 hours in future for verify_email', () => {
      const now = Date.now()
      const expires = generateExpiresAt('verify_email')
      const diff = expires.getTime() - now
      // Allow 1 second tolerance
      expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000)
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 1000)
    })

    it('generates date 1 hour in future for reset_password', () => {
      const now = Date.now()
      const expires = generateExpiresAt('reset_password')
      const diff = expires.getTime() - now
      expect(diff).toBeGreaterThan(60 * 60 * 1000 - 1000)
      expect(diff).toBeLessThan(60 * 60 * 1000 + 1000)
    })
  })
})
