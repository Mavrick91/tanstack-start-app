import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Switch } from '../../../ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../ui/table'

export interface ProductVariant {
  id?: string
  title: string
  selectedOptions: { name: string; value: string }[]
  price: string
  compareAtPrice?: string
  sku?: string
  barcode?: string
  weight?: string
  available: boolean
}

interface ProductVariantsTableProps {
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
  disabled?: boolean
}

export function ProductVariantsTable({
  variants,
  onChange,
  disabled = false,
}: ProductVariantsTableProps) {
  const { t } = useTranslation()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<ProductVariant>>({})

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditValues(variants[index])
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditValues({})
  }

  const saveEditing = () => {
    if (editingIndex === null) return
    const updated = [...variants]
    updated[editingIndex] = { ...updated[editingIndex], ...editValues }
    onChange(updated)
    setEditingIndex(null)
    setEditValues({})
  }

  const updateVariantField = (
    index: number,
    field: keyof ProductVariant,
    value: string | boolean,
  ) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const applyPriceToAll = (price: string) => {
    onChange(variants.map((v) => ({ ...v, price })))
  }

  if (variants.length === 0) {
    return (
      <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">
          {t('Add options above to generate variants')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
        <span className="text-xs font-semibold text-muted-foreground">
          {t('Bulk Actions')}:
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.01"
            placeholder={t('Set all prices')}
            className="w-32 h-8 text-sm"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyPriceToAll((e.target as HTMLInputElement).value)
              }
            }}
          />
          <span className="text-xs text-muted-foreground">
            {t('Press Enter to apply')}
          </span>
        </div>
      </div>

      {/* Variants Table */}
      <div className="border border-border/50 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-bold">{t('Variant')}</TableHead>
              <TableHead className="font-bold w-28">{t('Price')}</TableHead>
              <TableHead className="font-bold w-24">{t('Available')}</TableHead>
              <TableHead className="font-bold w-32">{t('SKU')}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={index} className="group">
                <TableCell className="font-medium">{variant.title}</TableCell>

                {editingIndex === index ? (
                  <>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.price || ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        className="h-8 w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={editValues.available !== false}
                        onCheckedChange={(checked) =>
                          setEditValues((prev) => ({
                            ...prev,
                            available: checked,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editValues.sku || ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            sku: e.target.value,
                          }))
                        }
                        className="h-8 w-full"
                        placeholder="SKU"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600"
                          onClick={saveEditing}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={cancelEditing}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <span className="font-mono">${variant.price}</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={variant.available !== false}
                        onCheckedChange={(checked) =>
                          updateVariantField(index, 'available', checked)
                        }
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground font-mono text-sm">
                        {variant.sku || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditing(index)}
                        disabled={disabled}
                      >
                        {t('Edit')}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {variants.length} {t('variants')} •{' '}
        {t('Toggle "Available" to temporarily hide variants')}
      </p>
    </div>
  )
}
