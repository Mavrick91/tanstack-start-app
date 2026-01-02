import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  getCookie,
  createSessionCookie,
  clearSessionCookie,
  getSessionExpiry,
} from './session'

describe('Session Utilities', () => {
  describe('getCookie', () => {
    it('returns undefined when no cookies', () => {
      const request = new Request('http://localhost', {
        headers: {},
      })
      expect(getCookie(request, 'session')).toBeUndefined()
    })

    it('returns cookie value when present', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'session=abc123; other=value',
        },
      })
      expect(getCookie(request, 'session')).toBe('abc123')
    })

    it('returns undefined when cookie not found', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'other=value',
        },
      })
      expect(getCookie(request, 'session')).toBeUndefined()
    })

    it('handles cookies with spaces', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: '  session=abc123  ;  other=value  ',
        },
      })
      expect(getCookie(request, 'session')).toBe('abc123')
    })
  })

  describe('createSessionCookie', () => {
    it('creates cookie with default maxAge', () => {
      const cookie = createSessionCookie('session-id-123')
      expect(cookie).toContain('session=session-id-123')
      expect(cookie).toContain('Path=/')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).toContain('Max-Age=604800') // 7 days
    })

    it('accepts custom maxAge', () => {
      const cookie = createSessionCookie('id', 3600)
      expect(cookie).toContain('Max-Age=3600')
    })
  })

  describe('clearSessionCookie', () => {
    it('creates cookie with Max-Age=0', () => {
      const cookie = clearSessionCookie()
      expect(cookie).toContain('session=')
      expect(cookie).toContain('Max-Age=0')
    })
  })

  describe('getSessionExpiry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns date 7 days in future by default', () => {
      const expiry = getSessionExpiry()
      expect(expiry).toEqual(new Date('2024-01-08T00:00:00Z'))
    })

    it('accepts custom days', () => {
      const expiry = getSessionExpiry(30)
      expect(expiry).toEqual(new Date('2024-01-31T00:00:00Z'))
    })
  })
})
