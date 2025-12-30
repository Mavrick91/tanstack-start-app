/**
 * API testing utilities for route handler tests.
 * Provides helpers for creating mock requests and parsing responses.
 */

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  cookies?: Record<string, string>
}

/**
 * Create a mock Request object for testing API handlers.
 */
export function createMockRequest(
  url: string,
  options: RequestOptions = {},
): Request {
  const { method = 'GET', body, headers = {}, cookies = {} } = options

  // Build cookie header
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')

  const allHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (cookieHeader) {
    allHeaders['Cookie'] = cookieHeader
  }

  const requestInit: RequestInit = {
    method,
    headers: allHeaders,
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new Request(url, requestInit)
}

/**
 * Parse a JSON response from an API handler.
 */
export async function parseJsonResponse<T = unknown>(
  response: Response,
): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`)
  }
}

/**
 * Helper type for checkout create response.
 */
export type CheckoutCreateResponse = {
  success: boolean
  error?: string
  checkout?: {
    id: string
    cartItems: Array<{
      productId: string
      variantId: string
      quantity: number
      title: string
      price: number
    }>
    subtotal: number
    shippingTotal: number
    taxTotal: number
    total: number
    currency: string
  }
}

/**
 * Helper type for checkout customer response.
 */
export type CheckoutCustomerResponse = {
  success: boolean
  error?: string
  checkout?: {
    id: string
    email: string
    customerId: string
  }
}

/**
 * Helper type for checkout shipping address response.
 */
export type CheckoutShippingAddressResponse = {
  success: boolean
  error?: string
  checkout?: {
    id: string
    shippingAddress: {
      firstName: string
      lastName: string
      address1: string
      city: string
      province?: string
      provinceCode?: string
      country: string
      countryCode: string
      zip: string
    }
  }
}

/**
 * Helper type for shipping rates response.
 */
export type ShippingRatesResponse = {
  success: boolean
  error?: string
  rates?: Array<{
    id: string
    name: string
    price: number
    estimatedDays: string
  }>
}

/**
 * Helper type for checkout complete response.
 */
export type CheckoutCompleteResponse = {
  success: boolean
  error?: string
  order?: {
    id: string
    orderNumber: number
    email: string
    total: number
  }
}

/**
 * Generate a valid checkout session token for testing.
 * This mimics the token generation from checkout-auth.ts
 */
export function generateTestCheckoutToken(checkoutId: string): string {
  // Simple token for testing - in production this uses crypto
  // We'll need to mock or use the real function
  return Buffer.from(`${checkoutId}:test-session`).toString('base64')
}

/**
 * Create handler context for TanStack Start route handlers.
 */
export function createHandlerContext(
  request: Request,
  params: Record<string, string> = {},
) {
  return {
    request,
    params,
  }
}
