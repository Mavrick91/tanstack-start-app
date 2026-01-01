/**
 * Client-side checkout cookie utilities.
 * These functions are safe to import in client-side code.
 */

/**
 * Set checkout ID cookie from client-side
 */
export const setCheckoutIdCookieClient = (checkoutId: string): void => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    document.cookie = `checkout_id=${checkoutId}; Path=/; SameSite=Strict; Expires=${expires.toUTCString()}`
  }
}

/**
 * Clear checkout ID cookie from client-side
 */
export const clearCheckoutIdCookieClient = (): void => {
  if (typeof document !== 'undefined') {
    document.cookie = 'checkout_id=; Path=/; SameSite=Strict; Max-Age=0'
  }
}

/**
 * Get checkout ID from document cookies (client-side)
 */
export const getCheckoutIdFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/checkout_id=([^;]+)/)
  return match?.[1] || null
}
