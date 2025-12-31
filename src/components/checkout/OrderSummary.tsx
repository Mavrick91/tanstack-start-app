import { useTranslation } from 'react-i18next'

import { formatCurrency } from '../../lib/format'

import type { CheckoutCartItem } from '../../types/checkout'

type OrderSummaryProps = {
  items: CheckoutCartItem[]
  subtotal: number
  shippingTotal?: number
  taxTotal?: number
  total: number
  currency?: string
  showItems?: boolean
}

export const OrderSummary = ({
  items,
  subtotal,
  shippingTotal = 0,
  taxTotal = 0,
  total,
  currency = 'USD',
  showItems = true,
}: OrderSummaryProps) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t('Order summary')}</h2>

      {showItems && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      {t('No image')}
                    </div>
                  )}
                </div>
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center font-medium">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                  {item.title}
                </p>
                {item.variantTitle && (
                  <p className="text-sm text-gray-500">{item.variantTitle}</p>
                )}
              </div>
              <div className="text-sm font-medium">
                {formatCurrency({
                  value: item.price * item.quantity,
                  currency,
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('Subtotal')}</span>
          <span>{formatCurrency({ value: subtotal, currency })}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('Shipping')}</span>
          <span>
            {shippingTotal === 0
              ? t('Calculated at next step')
              : formatCurrency({ value: shippingTotal, currency })}
          </span>
        </div>

        {taxTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('Tax')}</span>
            <span>{formatCurrency({ value: taxTotal, currency })}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-4 flex justify-between">
        <span className="text-base font-medium">{t('Total')}</span>
        <div className="text-right">
          <span className="text-xs text-gray-500 mr-2">{currency}</span>
          <span className="text-xl font-semibold">
            {formatCurrency({ value: total, currency })}
          </span>
        </div>
      </div>
    </div>
  )
}
