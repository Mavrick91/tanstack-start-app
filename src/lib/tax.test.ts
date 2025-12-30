import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { calculateTax, getTaxRate, formatTaxAmount } from './tax'

describe('Tax Calculation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getTaxRate', () => {
    it('should return default tax rate of 0.10 when TAX_RATE is not set', () => {
      delete process.env.TAX_RATE
      const rate = getTaxRate()
      expect(rate).toBe(0.1)
    })

    it('should return configured tax rate from environment', () => {
      process.env.TAX_RATE = '0.08'
      const rate = getTaxRate()
      expect(rate).toBe(0.08)
    })

    it('should handle percentage format (e.g., "10" for 10%)', () => {
      process.env.TAX_RATE = '10'
      const rate = getTaxRate()
      expect(rate).toBe(0.1)
    })

    it('should return 0 for invalid tax rate', () => {
      process.env.TAX_RATE = 'invalid'
      const rate = getTaxRate()
      expect(rate).toBe(0)
    })
  })

  describe('calculateTax', () => {
    it('should calculate tax correctly with default rate (10%)', () => {
      delete process.env.TAX_RATE
      const tax = calculateTax(100)
      expect(tax).toBe(10)
    })

    it('should calculate tax with custom rate', () => {
      const tax = calculateTax(100, 0.08)
      expect(tax).toBe(8)
    })

    it('should handle decimal amounts correctly', () => {
      const tax = calculateTax(99.99, 0.1)
      expect(tax).toBe(10) // Rounded to 2 decimal places
    })

    it('should return 0 for zero subtotal', () => {
      const tax = calculateTax(0)
      expect(tax).toBe(0)
    })

    it('should handle very small amounts', () => {
      const tax = calculateTax(0.01, 0.1)
      expect(tax).toBe(0) // 0.001 rounds to 0
    })

    it('should handle large amounts', () => {
      const tax = calculateTax(10000, 0.1)
      expect(tax).toBe(1000)
    })

    it('should round to 2 decimal places correctly', () => {
      // 33.33 * 0.1 = 3.333, should round to 3.33
      const tax = calculateTax(33.33, 0.1)
      expect(tax).toBe(3.33)
    })

    it('should handle rounding edge cases', () => {
      // 33.335 * 0.1 = 3.3335, should round to 3.33
      const tax = calculateTax(33.335, 0.1)
      expect(tax).toBeCloseTo(3.33, 2)
    })
  })

  describe('formatTaxAmount', () => {
    it('should format tax amount as string with 2 decimal places', () => {
      expect(formatTaxAmount(10)).toBe('10.00')
      expect(formatTaxAmount(10.5)).toBe('10.50')
      expect(formatTaxAmount(0)).toBe('0.00')
    })

    it('should handle decimal precision', () => {
      expect(formatTaxAmount(10.999)).toBe('11.00')
      expect(formatTaxAmount(10.994)).toBe('10.99')
    })
  })
})
