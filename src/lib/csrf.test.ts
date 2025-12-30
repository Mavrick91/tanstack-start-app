import { describe, expect, it } from 'vitest'

import {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfTokenFromRequest,
  createCsrfCookie,
} from './csrf'

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a non-empty token', () => {
      const token = generateCsrfToken()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate different tokens on each call', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })

    it('should generate tokens of consistent length', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1.length).toBe(token2.length)
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
    })
  })

  describe('validateCsrfToken', () => {
    it('should return true for matching tokens', () => {
      const token = generateCsrfToken()
      expect(validateCsrfToken(token, token)).toBe(true)
    })

    it('should return false for non-matching tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(validateCsrfToken(token1, token2)).toBe(false)
    })

    it('should return false for empty tokens', () => {
      expect(validateCsrfToken('', '')).toBe(false)
      expect(validateCsrfToken('valid', '')).toBe(false)
      expect(validateCsrfToken('', 'valid')).toBe(false)
    })

    it('should return false for undefined tokens', () => {
      expect(validateCsrfToken(undefined as unknown as string, 'valid')).toBe(
        false,
      )
      expect(validateCsrfToken('valid', undefined as unknown as string)).toBe(
        false,
      )
    })
  })

  describe('getCsrfTokenFromRequest', () => {
    it('should extract token from x-csrf-token header', () => {
      const token = 'test-csrf-token'
      const request = new Request('http://localhost', {
        headers: { 'x-csrf-token': token },
      })

      expect(getCsrfTokenFromRequest(request)).toBe(token)
    })

    it('should extract token from cookie', () => {
      const token = 'test-csrf-token'
      const request = new Request('http://localhost', {
        headers: { Cookie: `csrf_token=${token}` },
      })

      expect(getCsrfTokenFromRequest(request)).toBe(token)
    })

    it('should prefer header over cookie', () => {
      const headerToken = 'header-token'
      const cookieToken = 'cookie-token'
      const request = new Request('http://localhost', {
        headers: {
          'x-csrf-token': headerToken,
          Cookie: `csrf_token=${cookieToken}`,
        },
      })

      expect(getCsrfTokenFromRequest(request)).toBe(headerToken)
    })

    it('should return undefined when no token present', () => {
      const request = new Request('http://localhost')
      expect(getCsrfTokenFromRequest(request)).toBeUndefined()
    })
  })

  describe('createCsrfCookie', () => {
    it('should create a valid cookie string', () => {
      const token = 'test-token'
      const cookie = createCsrfCookie(token)

      expect(cookie).toContain(`csrf_token=${token}`)
      expect(cookie).toContain('Path=/')
      expect(cookie).toContain('SameSite=Strict')
    })

    it('should include HttpOnly flag', () => {
      const cookie = createCsrfCookie('test')
      expect(cookie).toContain('HttpOnly')
    })
  })
})
