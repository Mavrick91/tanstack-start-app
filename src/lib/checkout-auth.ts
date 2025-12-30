import { createHmac } from 'crypto'

import { eq } from 'drizzle-orm'

import { db } from '../db'
import { checkouts } from '../db/schema'

const CHECKOUT_SECRET = process.env.CHECKOUT_SECRET || 'checkout-secret-key'

export interface CheckoutAccessResult {
  valid: boolean
  checkout?: typeof checkouts.$inferSelect
  error?: string
}

export function generateCheckoutToken(checkoutId: string): string {
  const hmac = createHmac('sha256', CHECKOUT_SECRET)
  hmac.update(checkoutId)
  return hmac.digest('hex')
}

export function verifyCheckoutToken(
  checkoutId: string,
  token: string,
): boolean {
  const expectedToken = generateCheckoutToken(checkoutId)
  return token === expectedToken
}

export async function validateCheckoutAccess(
  checkoutId: string,
  request: Request,
): Promise<CheckoutAccessResult> {
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId))
    .limit(1)

  if (!checkout) {
    return { valid: false, error: 'Checkout not found' }
  }

  if (checkout.completedAt) {
    return { valid: false, error: 'Checkout already completed' }
  }

  if (checkout.expiresAt < new Date()) {
    return { valid: false, error: 'Checkout expired' }
  }

  const cookieHeader = request.headers.get('Cookie') || ''
  const sessionTokenMatch = cookieHeader.match(/checkout_session=([^;]+)/)
  const sessionToken = sessionTokenMatch?.[1]

  const checkoutRecord = checkout as typeof checkout & {
    sessionToken?: string | null
  }
  if (!checkout.customerId && !checkoutRecord.sessionToken && !sessionToken) {
    return { valid: true, checkout }
  }

  if (!checkout.customerId && sessionToken) {
    if (verifyCheckoutToken(checkoutId, sessionToken)) {
      return { valid: true, checkout }
    }
    return { valid: false, error: 'Unauthorized' }
  }

  if (!checkout.customerId && !sessionToken) {
    return { valid: false, error: 'Unauthorized' }
  }

  return { valid: true, checkout }
}

export function createCheckoutSessionCookie(checkoutId: string): string {
  const token = generateCheckoutToken(checkoutId)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return `checkout_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`
}
