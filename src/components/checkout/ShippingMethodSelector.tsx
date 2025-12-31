import { useTranslation } from 'react-i18next'

import { formatCurrency } from '../../lib/format'
import { cn } from '../../lib/utils'

import type { ShippingRate } from '../../types/checkout'

type ShippingMethodSelectorProps = {
  rates: ShippingRate[]
  selectedRateId?: string
  onSelect: (rateId: string) => void
  currency?: string
}

export const ShippingMethodSelector = ({
  rates,
  selectedRateId,
  onSelect,
  currency = 'USD',
}: ShippingMethodSelectorProps) => {
  const { t } = useTranslation()

  return (
    <div className="border rounded-lg divide-y">
      {rates.map((rate) => {
        const isSelected = selectedRateId === rate.id

        return (
          <label
            key={rate.id}
            className={cn(
              'flex items-center gap-3 p-4 cursor-pointer transition-colors',
              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
            )}
          >
            <input
              type="radio"
              name="shipping-method"
              value={rate.id}
              checked={isSelected}
              onChange={() => onSelect(rate.id)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{rate.name}</span>
                <span className="font-medium">
                  {rate.isFree || rate.price === 0
                    ? t('Free')
                    : formatCurrency({ value: rate.price, currency })}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {rate.estimatedDays}
              </p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
