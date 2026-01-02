export type FormatCurrencyOptions = {
  value: number | string | null | undefined
  currency?: string
  locale?: string
}

export const formatCurrency = ({
  value,
  currency = 'USD',
  locale = 'en-US',
}: FormatCurrencyOptions) => {
  if (value === null || value === undefined) return '—'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(numValue)
}

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'datetime'

export const formatDate = (
  date: Date | string | undefined,
  style: DateFormatStyle = 'medium',
  locale = 'en-US',
): string => {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  const optionsMap: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    datetime: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  }
  const options = optionsMap[style]

  return d.toLocaleDateString(locale, options)
}
