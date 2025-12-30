import { describe, expect, it } from 'vitest'

import {
  validateEmailRequired,
  validateEmailFormat,
  validateEmail,
  normalizeEmail,
} from './email'

describe('Email Validation', () => {
  describe('validateEmailRequired', () => {
    it('returns valid for non-empty email', () => {
      const result = validateEmailRequired('test@example.com')

      expect(result).toEqual({ valid: true })
    })

    it('returns error for null', () => {
      const result = validateEmailRequired(null)

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns error for undefined', () => {
      const result = validateEmailRequired(undefined)

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns error for empty string', () => {
      const result = validateEmailRequired('')

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns error for whitespace-only string', () => {
      const result = validateEmailRequired('   ')

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns valid for email with leading/trailing spaces', () => {
      const result = validateEmailRequired('  test@example.com  ')

      expect(result).toEqual({ valid: true })
    })
  })

  describe('validateEmailFormat', () => {
    it('returns valid for standard email', () => {
      const result = validateEmailFormat('test@example.com')

      expect(result).toEqual({ valid: true })
    })

    it('returns valid for email with subdomain', () => {
      const result = validateEmailFormat('test@mail.example.com')

      expect(result).toEqual({ valid: true })
    })

    it('returns valid for email with plus sign', () => {
      const result = validateEmailFormat('user+tag@example.com')

      expect(result).toEqual({ valid: true })
    })

    it('returns valid for email with country TLD', () => {
      const result = validateEmailFormat('user@example.co.uk')

      expect(result).toEqual({ valid: true })
    })

    it('returns error for missing @', () => {
      const result = validateEmailFormat('testexample.com')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('returns error for missing domain', () => {
      const result = validateEmailFormat('test@')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('returns error for missing local part', () => {
      const result = validateEmailFormat('@example.com')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('returns error for missing TLD', () => {
      const result = validateEmailFormat('test@example')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('returns error for spaces in email', () => {
      const result = validateEmailFormat('test @example.com')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('returns error for plain text', () => {
      const result = validateEmailFormat('invalid')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })
  })

  describe('validateEmail', () => {
    it('returns valid for valid email', () => {
      const result = validateEmail('test@example.com')

      expect(result).toEqual({ valid: true })
    })

    it('returns required error for null', () => {
      const result = validateEmail(null)

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns required error for empty string', () => {
      const result = validateEmail('')

      expect(result).toEqual({
        valid: false,
        error: 'Email is required',
        status: 400,
      })
    })

    it('returns format error for invalid format', () => {
      const result = validateEmail('invalid')

      expect(result).toEqual({
        valid: false,
        error: 'Invalid email format',
        status: 400,
      })
    })

    it('checks required before format', () => {
      // Empty string should return required error, not format error
      const result = validateEmail('')

      expect((result as { error: string }).error).toBe('Email is required')
    })
  })

  describe('normalizeEmail', () => {
    it('converts to lowercase', () => {
      const result = normalizeEmail('TEST@EXAMPLE.COM')

      expect(result).toBe('test@example.com')
    })

    it('trims whitespace', () => {
      const result = normalizeEmail('  test@example.com  ')

      expect(result).toBe('test@example.com')
    })

    it('handles mixed case', () => {
      const result = normalizeEmail('User@Example.COM')

      expect(result).toBe('user@example.com')
    })
  })
})
