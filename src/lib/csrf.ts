import { randomBytes, timingSafeEqual } from 'crypto'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate a CSRF token against an expected token
 * Uses timing-safe comparison to prevent timing attacks
 */
export function validateCsrfToken(
  token: string | undefined,
  expectedToken: string | undefined,
): boolean {
  if (
    !token ||
    !expectedToken ||
    token.length === 0 ||
    expectedToken.length === 0
  ) {
    return false
  }

  // Ensure same length for timing-safe comparison
  if (token.length !== expectedToken.length) {
    return false
  }

  try {
    const tokenBuffer = Buffer.from(token)
    const expectedBuffer = Buffer.from(expectedToken)
    return timingSafeEqual(tokenBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * Extract CSRF token from request
 * Checks header first, then cookie
 */
export function getCsrfTokenFromRequest(request: Request): string | undefined {
  // Check header first (preferred for API requests)
  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken) {
    return headerToken
  }

  // Check cookie (for form submissions)
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(/csrf_token=([^;]+)/)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

/**
 * Create a Set-Cookie header for the CSRF token
 */
export function createCsrfCookie(token: string): string {
  // CSRF cookies should be:
  // - HttpOnly: not accessible by JavaScript
  // - SameSite=Strict: only sent with same-site requests
  // - Secure in production
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `csrf_token=${token}; Path=/; HttpOnly; SameSite=Strict${secure}`
}

/**
 * Middleware helper to validate CSRF for state-changing requests
 */
export function validateCsrfForRequest(
  request: Request,
  sessionToken: string,
): { valid: boolean; error?: string } {
  // Only validate for state-changing methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true }
  }

  const csrfToken = getCsrfTokenFromRequest(request)
  if (!csrfToken) {
    return { valid: false, error: 'CSRF token missing' }
  }

  if (!validateCsrfToken(csrfToken, sessionToken)) {
    return { valid: false, error: 'CSRF token invalid' }
  }

  return { valid: true }
}
