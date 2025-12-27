import { describe, expect, it } from 'vitest'

import { generateVariantCombinations } from '../../server/products'

describe('generateVariantCombinations', () => {
  it('should return empty array with single empty combo for no options', () => {
    const result = generateVariantCombinations([])
    expect(result).toEqual([[]])
  })

  it('should generate combinations for single option', () => {
    const options = [{ name: 'Shape', values: ['Coffin', 'Almond'] }]
    const result = generateVariantCombinations(options)

    expect(result).toEqual([
      [{ name: 'Shape', value: 'Coffin' }],
      [{ name: 'Shape', value: 'Almond' }],
    ])
  })

  it('should generate Cartesian product for two options', () => {
    const options = [
      { name: 'Shape', values: ['Coffin', 'Almond'] },
      { name: 'Length', values: ['Short', 'Long'] },
    ]
    const result = generateVariantCombinations(options)

    expect(result).toHaveLength(4) // 2 * 2 = 4
    expect(result).toEqual([
      [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Short' },
      ],
      [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Long' },
      ],
      [
        { name: 'Shape', value: 'Almond' },
        { name: 'Length', value: 'Short' },
      ],
      [
        { name: 'Shape', value: 'Almond' },
        { name: 'Length', value: 'Long' },
      ],
    ])
  })

  it('should generate Cartesian product for three options', () => {
    const options = [
      { name: 'Shape', values: ['Coffin', 'Almond'] },
      { name: 'Length', values: ['Short', 'Long'] },
      { name: 'Finish', values: ['Matte', 'Glossy'] },
    ]
    const result = generateVariantCombinations(options)

    expect(result).toHaveLength(8) // 2 * 2 * 2 = 8
    // First combo should have all three options
    expect(result[0]).toEqual([
      { name: 'Shape', value: 'Coffin' },
      { name: 'Length', value: 'Short' },
      { name: 'Finish', value: 'Matte' },
    ])
  })

  it('should handle option with single value', () => {
    const options = [
      { name: 'Shape', values: ['Coffin'] },
      { name: 'Length', values: ['Short', 'Long'] },
    ]
    const result = generateVariantCombinations(options)

    expect(result).toHaveLength(2) // 1 * 2 = 2
    expect(result).toEqual([
      [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Short' },
      ],
      [
        { name: 'Shape', value: 'Coffin' },
        { name: 'Length', value: 'Long' },
      ],
    ])
  })

  it('should handle nail industry presets (5 shapes × 4 lengths = 20)', () => {
    const options = [
      {
        name: 'Shape',
        values: ['Coffin', 'Almond', 'Oval', 'Square', 'Stiletto'],
      },
      { name: 'Length', values: ['Short', 'Medium', 'Long', 'XL'] },
    ]
    const result = generateVariantCombinations(options)

    expect(result).toHaveLength(20) // 5 * 4 = 20

    // Verify first and last combinations
    expect(result[0]).toEqual([
      { name: 'Shape', value: 'Coffin' },
      { name: 'Length', value: 'Short' },
    ])
    expect(result[19]).toEqual([
      { name: 'Shape', value: 'Stiletto' },
      { name: 'Length', value: 'XL' },
    ])
  })
})

describe('Variant Title Generation', () => {
  it('should generate title from selectedOptions', () => {
    const combo = [
      { name: 'Shape', value: 'Coffin' },
      { name: 'Length', value: 'Long' },
    ]
    const title = combo.map((o) => o.value).join(' / ')
    expect(title).toBe('Coffin / Long')
  })

  it('should generate single value title', () => {
    const combo = [{ name: 'Shape', value: 'Coffin' }]
    const title = combo.map((o) => o.value).join(' / ')
    expect(title).toBe('Coffin')
  })

  it('should generate three-option title', () => {
    const combo = [
      { name: 'Shape', value: 'Stiletto' },
      { name: 'Length', value: 'XL' },
      { name: 'Finish', value: 'Glossy' },
    ]
    const title = combo.map((o) => o.value).join(' / ')
    expect(title).toBe('Stiletto / XL / Glossy')
  })
})

describe('Variant Input Normalization', () => {
  it('should default title to "Default Title" if not provided', () => {
    const input: { price: string; title?: string } = { price: '25.00' }
    const title = input.title || 'Default Title'
    expect(title).toBe('Default Title')
  })

  it('should default available to true (1) if not specified', () => {
    const input: { price: string; available?: boolean } = { price: '25.00' }
    const available = input.available !== false ? 1 : 0
    expect(available).toBe(1)
  })

  it('should set available to 0 when explicitly false', () => {
    const input = { price: '25.00', available: false }
    const available = input.available !== false ? 1 : 0
    expect(available).toBe(0)
  })

  it('should default selectedOptions to empty array', () => {
    const input: {
      price: string
      selectedOptions?: { name: string; value: string }[]
    } = { price: '25.00' }
    const selectedOptions = input.selectedOptions || []
    expect(selectedOptions).toEqual([])
  })
})
