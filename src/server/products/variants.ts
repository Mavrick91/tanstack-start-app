/**
 * Product Variant Utilities
 *
 * Functions for generating and managing product variants.
 */

import type { ProductOptionInput } from '../schemas/products'

/**
 * Represents a selected option value for a variant
 */
export type SelectedOption = { name: string; value: string }

/**
 * Generates all possible variant combinations from product options.
 *
 * Uses recursive algorithm to create cartesian product of all option values.
 *
 * @param options - Array of product options, each with a name and array of values
 * @returns Array of variant combinations, where each combination is an array of selected options
 *
 * @example
 * ```typescript
 * const options = [
 *   { name: 'Size', values: ['S', 'M', 'L'] },
 *   { name: 'Color', values: ['Red', 'Blue'] }
 * ]
 * const combinations = generateVariantCombinations(options)
 * // Returns:
 * // [
 * //   [{ name: 'Size', value: 'S' }, { name: 'Color', value: 'Red' }],
 * //   [{ name: 'Size', value: 'S' }, { name: 'Color', value: 'Blue' }],
 * //   [{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Red' }],
 * //   [{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Blue' }],
 * //   [{ name: 'Size', value: 'L' }, { name: 'Color', value: 'Red' }],
 * //   [{ name: 'Size', value: 'L' }, { name: 'Color', value: 'Blue' }],
 * // ]
 * ```
 */
export const generateVariantCombinations = (
  options: ProductOptionInput[],
): SelectedOption[][] => {
  if (options.length === 0) return [[]]

  const [first, ...rest] = options
  const restCombinations: SelectedOption[][] = generateVariantCombinations(rest)

  return first.values.flatMap((value: string) =>
    restCombinations.map((combo: SelectedOption[]) => [
      { name: first.name, value },
      ...combo,
    ]),
  )
}
