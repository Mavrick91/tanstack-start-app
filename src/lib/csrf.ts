import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const getCsrfSecret = () => {
  const secret = process.env.CHECKOUT_SECRET
  if (!secret) {
    throw new Error('CHECKOUT_SECRET required for CSRF protection')
  }
  return secret
}

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = () => {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a CSRF token tied to a session ID
 * Uses HMAC so we don't need to store it in the database
 */
export const generateSessionCsrfToken = (sessionId: string) => {
  const hmac = createHmac('sha256', getCsrfSecret())
  hmac.update(`csrf:${sessionId}`)
  return hmac.digest('hex')
}

/**
 * Verify a CSRF token against a session ID
 */
export const verifySessionCsrfToken = (
  token: string | undefined,
  sessionId: string,
): boolean => {
  if (!token) return false
  const expectedToken = generateSessionCsrfToken(sessionId)
  return validateCsrfToken(token, expectedToken)
}

/**
 * Validate a CSRF token against an expected token
 * Uses timing-safe comparison to prevent timing attacks
 */
export const validateCsrfToken = (
  token: string | undefined,
  expectedToken: string | undefined,
): boolean => {
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
export const getCsrfTokenFromRequest = (
  request: Request,
): string | undefined => {
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
export const createCsrfCookie = (token: string) => {
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
export const validateCsrfForRequest = (
  request: Request,
  sessionToken: string,
): { valid: boolean; error?: string } => {
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

/**
 * Validate CSRF token against a session ID
 * Returns error response if invalid, undefined if valid
 */
export const validateCsrf = (
  request: Request,
  sessionId: string | undefined,
): Response | undefined => {
  // Skip for safe methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return undefined
  }

  // If no session, allow request (will be caught by auth check)
  if (!sessionId) {
    return undefined
  }

  const csrfToken = getCsrfTokenFromRequest(request)
  if (!verifySessionCsrfToken(csrfToken, sessionId)) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return undefined
}
