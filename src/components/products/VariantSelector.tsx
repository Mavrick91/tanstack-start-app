import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button'
import { Label } from '../ui/label'

import type { ProductOption, ProductVariant } from '../../types/store'

interface VariantSelectorProps {
  options: ProductOption[]
  variants: ProductVariant[]
  onVariantChange: (variant: ProductVariant | null) => void
}

export function VariantSelector({
  options,
  variants,
  onVariantChange,
}: VariantSelectorProps) {
  const { t } = useTranslation()

  // Track selected value for each option
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(() => {
    // Initialize with first available variant's options, or first option values
    const firstAvailable = variants.find((v) => v.available) || variants[0]
    if (firstAvailable?.selectedOptions) {
      return Object.fromEntries(
        firstAvailable.selectedOptions.map((o) => [o.name, o.value]),
      )
    }
    // Fallback: select first value of each option
    return Object.fromEntries(options.map((o) => [o.name, o.values[0] || '']))
  })

  // Find the variant matching current selections
  const selectedVariant = useMemo(() => {
    return (
      variants.find((variant) => {
        if (!variant.selectedOptions) return false
        return variant.selectedOptions.every(
          (opt) => selectedOptions[opt.name] === opt.value,
        )
      }) || null
    )
  }, [variants, selectedOptions])

  // Notify parent of variant change
  const handleOptionChange = useCallback(
    (optionName: string, value: string) => {
      const newSelections = { ...selectedOptions, [optionName]: value }
      setSelectedOptions(newSelections)

      // Find matching variant
      const newVariant = variants.find((variant) => {
        if (!variant.selectedOptions) return false
        return variant.selectedOptions.every(
          (opt) => newSelections[opt.name] === opt.value,
        )
      })

      onVariantChange(newVariant || null)
    },
    [selectedOptions, variants, onVariantChange],
  )

  // Check if a specific option value is available (has at least one available variant)
  const isOptionValueAvailable = useCallback(
    (optionName: string, value: string) => {
      return variants.some((variant) => {
        if (!variant.available || !variant.selectedOptions) return false
        const hasThisValue = variant.selectedOptions.some(
          (o) => o.name === optionName && o.value === value,
        )
        if (!hasThisValue) return false
        // Check if other selected options match
        return variant.selectedOptions.every((o) => {
          if (o.name === optionName) return true
          return selectedOptions[o.name] === o.value
        })
      })
    },
    [variants, selectedOptions],
  )

  // Notify parent on initial mount
  useMemo(() => {
    onVariantChange(selectedVariant)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (options.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {options.map((option) => (
        <div key={option.name} className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {option.name}
          </Label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selectedOptions[option.name] === value
              const isAvailable = isOptionValueAvailable(option.name, value)

              return (
                <Button
                  key={value}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  disabled={!isAvailable}
                  onClick={() => handleOptionChange(option.name, value)}
                  className={`
                    min-w-[60px] h-10 px-4 rounded-lg font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'hover:border-primary/50'
                    }
                    ${!isAvailable ? 'opacity-40 line-through' : ''}
                  `}
                >
                  {value}
                </Button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Availability indicator */}
      {selectedVariant && !selectedVariant.available && (
        <p className="text-sm text-destructive font-medium">
          {t('This combination is currently unavailable')}
        </p>
      )}
    </div>
  )
}
