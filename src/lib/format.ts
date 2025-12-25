/**
 * Formats a number as a currency string.
 */
export type FormatCurrencyOptions = {
  value: number
  currency?: string
  locale?: string
}

export function formatCurrency({
  value,
  currency = 'USD',
  locale = 'en-US',
}: FormatCurrencyOptions): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value)
}
