import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'

// Nail industry presets
export const NAIL_PRESETS: ProductOption[] = [
  {
    name: 'Shape',
    values: ['Coffin', 'Almond', 'Oval', 'Square', 'Stiletto'],
  },
  {
    name: 'Length',
    values: ['Short', 'Medium', 'Long', 'XL'],
  },
]

export interface ProductOption {
  name: string
  values: string[]
}

interface ProductOptionsProps {
  options: ProductOption[]
  onChange: (options: ProductOption[]) => void
  disabled?: boolean
}

export function ProductOptions({
  options,
  onChange,
  disabled = false,
}: ProductOptionsProps) {
  const { t } = useTranslation()
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  )

  const addOption = () => {
    onChange([...options, { name: '', values: [] }])
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  const updateOptionName = (index: number, name: string) => {
    const updated = [...options]
    updated[index] = { ...updated[index], name }
    onChange(updated)
  }

  const addValue = (optionIndex: number, value: string) => {
    if (!value.trim()) return
    const updated = [...options]
    if (!updated[optionIndex].values.includes(value.trim())) {
      updated[optionIndex] = {
        ...updated[optionIndex],
        values: [...updated[optionIndex].values, value.trim()],
      }
      onChange(updated)
    }
    setNewValueInputs((prev) => ({ ...prev, [optionIndex]: '' }))
  }

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const updated = [...options]
    updated[optionIndex] = {
      ...updated[optionIndex],
      values: updated[optionIndex].values.filter((_, i) => i !== valueIndex),
    }
    onChange(updated)
  }

  const handleValueKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    optionIndex: number,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue(optionIndex, newValueInputs[optionIndex] || '')
    }
  }

  if (options.length === 0) {
    return (
      <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          {t('Add options like Shape, Length, or Size to create variants')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            type="button"
            variant="default"
            onClick={() => onChange(NAIL_PRESETS)}
            disabled={disabled}
            className="gap-2 bg-pink-500 hover:bg-pink-600"
          >
            <Plus className="w-4 h-4" />
            {t('Use Nail Presets')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            disabled={disabled}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('Add Custom Option')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t(
            'Nail presets include: Shape (Coffin, Almond, Oval, Square, Stiletto) and Length (Short, Medium, Long, XL)',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {options.map((option, optionIndex) => (
        <div
          key={optionIndex}
          className="border border-border/50 rounded-xl p-4 bg-background/50"
        >
          <div className="flex items-start gap-3">
            <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />

            <div className="flex-1 space-y-3">
              {/* Option Name */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-semibold mb-1 block">
                    {t('Option Name')}
                  </Label>
                  <Input
                    value={option.name}
                    onChange={(e) =>
                      updateOptionName(optionIndex, e.target.value)
                    }
                    placeholder={t('e.g., Shape, Length, Size')}
                    className="h-10 rounded-lg"
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(optionIndex)}
                  disabled={disabled}
                  data-testid={`delete-option-${optionIndex}`}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Option Values */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {t('Option Values')}
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {option.values.map((value, valueIndex) => (
                    <Badge
                      key={valueIndex}
                      variant="secondary"
                      className="gap-1 px-2 py-1 text-sm"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => removeValue(optionIndex, valueIndex)}
                        disabled={disabled}
                        data-testid={`remove-value-${optionIndex}-${valueIndex}`}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newValueInputs[optionIndex] || ''}
                    onChange={(e) =>
                      setNewValueInputs((prev) => ({
                        ...prev,
                        [optionIndex]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleValueKeyDown(e, optionIndex)}
                    placeholder={t('Add value and press Enter')}
                    className="h-9 rounded-lg flex-1"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addValue(optionIndex, newValueInputs[optionIndex] || '')
                    }
                    disabled={disabled}
                    data-testid={`add-value-${optionIndex}`}
                    className="h-9"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addOption}
        disabled={disabled}
        className="w-full gap-2 border-dashed"
      >
        <Plus className="w-4 h-4" />
        {t('Add Another Option')}
      </Button>
    </div>
  )
}
