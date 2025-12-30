import { createHmac, timingSafeEqual } from 'crypto'

import { eq } from 'drizzle-orm'

import { getCsrfTokenFromRequest } from './csrf'
import { db } from '../db'
import { checkouts } from '../db/schema'

function getCheckoutSecret(): string {
  const secret = process.env.CHECKOUT_SECRET
  if (!secret) {
    throw new Error('CHECKOUT_SECRET environment variable is required')
  }
  return secret
}

export interface CheckoutAccessResult {
  valid: boolean
  checkout?: typeof checkouts.$inferSelect
  error?: string
}

export function generateCheckoutToken(checkoutId: string): string {
  const hmac = createHmac('sha256', getCheckoutSecret())
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

  // Guest checkout: require valid session token
  if (!checkout.customerId) {
    if (!sessionToken) {
      return { valid: false, error: 'Session token required' }
    }
    if (!verifyCheckoutToken(checkoutId, sessionToken)) {
      return { valid: false, error: 'Invalid session token' }
    }

    // CSRF validation for state-changing methods
    // Skip in E2E test mode when E2E_TESTING env is set
    const method = request.method.toUpperCase()
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
      !process.env.E2E_TESTING
    ) {
      const csrfToken = getCsrfTokenFromRequest(request)
      if (!csrfToken || !timingSafeCompare(csrfToken, sessionToken)) {
        return { valid: false, error: 'Invalid CSRF token' }
      }
    }

    return { valid: true, checkout }
  }

  // Authenticated checkout: customerId exists
  return { valid: true, checkout }
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export function createCheckoutSessionCookie(checkoutId: string): string {
  const token = generateCheckoutToken(checkoutId)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const isProduction = process.env.NODE_ENV === 'production'
  const secureFlag = isProduction ? ' Secure;' : ''
  return `checkout_session=${token}; Path=/; HttpOnly; SameSite=Strict;${secureFlag} Expires=${expires.toUTCString()}`
}
