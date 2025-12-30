import { describe, expect, it } from 'vitest'

import { validatePassword } from './password-validation'

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should reject empty password', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Abc123')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'Aa1' + 'a'.repeat(126)
      const result = validatePassword(longPassword)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password too long')
    })

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('ABCDEFGH1')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password must contain a lowercase letter')
    })

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('abcdefgh1')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password must contain an uppercase letter')
    })

    it('should reject password without number', () => {
      const result = validatePassword('Abcdefghi')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Password must contain a number')
    })

    it('should accept valid password with all requirements', () => {
      const result = validatePassword('Abcdefg1')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept password with special characters', () => {
      const result = validatePassword('Abcdefg1!@#')
      expect(result.valid).toBe(true)
    })

    it('should accept password at exactly 8 characters', () => {
      const result = validatePassword('Abcdefg1')
      expect(result.valid).toBe(true)
    })

    it('should accept password at exactly 128 characters', () => {
      const password = 'Aa1' + 'a'.repeat(125)
      expect(password.length).toBe(128)
      const result = validatePassword(password)
      expect(result.valid).toBe(true)
    })
  })
})
