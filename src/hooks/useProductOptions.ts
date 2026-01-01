import { useState, useCallback } from 'react'

import type { ProductOption } from '../components/admin/products/components/ProductOptions'
import type { ProductVariant } from '../components/admin/products/components/ProductVariantsTable'
import type { Product } from '../components/admin/products/ProductForm'

type SelectedOption = { name: string; value: string }

/**
 * Hook for managing product options and variants state.
 * Handles initialization from existing product data and variant generation.
 */
export function useProductOptions(product?: Product) {
  // Options state - initialize from product if editing
  const [options, setOptions] = useState<ProductOption[]>(() => {
    if (product?.options && product.options.length > 0) {
      return product.options.map((o) => ({ name: o.name, values: o.values }))
    }
    return []
  })

  // Variants state - initialize from product if editing
  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku || undefined,
        available: v.available === 1,
        selectedOptions: v.selectedOptions || [],
      }))
    }
    return [
      {
        title: 'Default Title',
        price: '0',
        available: true,
        selectedOptions: [],
      },
    ]
  })

  // Add a new option
  const addOption = useCallback((option: ProductOption) => {
    setOptions((prev) => [...prev, option])
  }, [])

  // Remove an option by index
  const removeOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Update an option at index
  const updateOption = useCallback((index: number, option: ProductOption) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? option : o)))
  }, [])

  // Generate all variant combinations from current options
  const generateVariantCombinations = useCallback((): SelectedOption[][] => {
    if (options.length === 0) return [[]]

    const generateCombos = (opts: ProductOption[]): SelectedOption[][] => {
      if (opts.length === 0) return [[]]
      const [first, ...rest] = opts
      const restCombinations = generateCombos(rest)
      return first.values.flatMap((value: string) =>
        restCombinations.map((combo) => [
          { name: first.name, value },
          ...combo,
        ]),
      )
    }

    return generateCombos(options)
  }, [options])

  // Regenerate variants from options (preserving existing prices where possible)
  const regenerateVariants = useCallback(
    (defaultPrice = '0') => {
      const combinations = generateVariantCombinations()

      if (combinations.length === 0 || combinations[0].length === 0) {
        // No options - create default variant
        setVariants([
          {
            title: 'Default Title',
            price: defaultPrice,
            available: true,
            selectedOptions: [],
          },
        ])
        return
      }

      // Create variants from combinations, preserving existing data where possible
      const newVariants = combinations.map((combo) => {
        const title = combo.map((o) => o.value).join(' / ')

        // Try to find existing variant with same options
        const existing = variants.find((v) =>
          v.selectedOptions?.every(
            (so) => combo.find((c) => c.name === so.name)?.value === so.value,
          ),
        )

        return {
          id: existing?.id,
          title,
          price: existing?.price || defaultPrice,
          sku: existing?.sku,
          available: existing?.available ?? true,
          selectedOptions: combo,
        }
      })

      setVariants(newVariants)
    },
    [generateVariantCombinations, variants],
  )

  return {
    options,
    setOptions,
    variants,
    setVariants,
    addOption,
    removeOption,
    updateOption,
    regenerateVariants,
    generateVariantCombinations,
  }
}
