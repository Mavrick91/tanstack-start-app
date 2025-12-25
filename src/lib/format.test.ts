import { describe, expect, it } from 'vitest'

import { formatCurrency } from './format'

describe('formatCurrency Utility', () => {
  it('should format USD by default', () => {
    const result = formatCurrency({ value: 100 })
    // Note: Some environments use non-breaking space (0xA0) or other space chars
    expect(result.replace(/\s/g, ' ')).toBe('$100.00')
  })

  it('should format EUR in fr-FR locale', () => {
    const result = formatCurrency({
      value: 100,
      currency: 'EUR',
      locale: 'fr-FR',
    })
    expect(result.replace(/\u00a0/g, ' ')).toBe('100,00 €')
  })

  it('should handle zero value', () => {
    const result = formatCurrency({ value: 0 })
    expect(result.replace(/\s/g, ' ')).toBe('$0.00')
  })
})
