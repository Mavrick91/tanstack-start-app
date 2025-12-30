/**
 * Security headers for HTTP responses
 */
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * Content Security Policy for HTML responses
 */
export const cspHeader: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://res.cloudinary.com https://*.stripe.com",
    'frame-src https://js.stripe.com https://www.paypal.com',
    "connect-src 'self' https://api.stripe.com https://www.paypal.com",
  ].join('; '),
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Apply security headers with CSP to a response (for HTML pages)
 */
export function applySecurityHeadersWithCsp(response: Response): Response {
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value)
  }

  for (const [key, value] of Object.entries(cspHeader)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
