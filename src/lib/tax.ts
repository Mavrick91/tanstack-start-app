const DEFAULT_TAX_RATE = 0.1

// Get tax rate from environment (supports 0.10 or 10 format)
export const getTaxRate = (): number => {
  const envRate = process.env.TAX_RATE
  if (!envRate) return DEFAULT_TAX_RATE

  const parsedRate = parseFloat(envRate)
  if (isNaN(parsedRate)) return 0

  return parsedRate > 1 ? parsedRate / 100 : parsedRate
}

// Calculate tax amount, rounded to 2 decimal places
export const calculateTax = (subtotal: number, rate?: number): number => {
  const taxRate = rate ?? getTaxRate()
  return Math.round(subtotal * taxRate * 100) / 100
}

// Format tax amount for database storage
export const formatTaxAmount = (amount: number): string => {
  return amount.toFixed(2)
}
