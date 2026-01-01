export type FormatCurrencyOptions = {
  value: number
  currency?: string
  locale?: string
}

export const formatCurrency = ({
  value,
  currency = 'USD',
  locale = 'en-US',
}: FormatCurrencyOptions) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value)
}
