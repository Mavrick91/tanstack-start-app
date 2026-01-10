// Convert dollars to cents (for Stripe API)
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100)
}

// Convert cents to dollars (for display)
export const centsToDollars = (cents: number): number => {
  return cents / 100
}
