/**
 * API Response utilities for consistent error handling across all endpoints.
 * In development, errors include detailed information for debugging.
 * In production, errors are generic to avoid leaking implementation details.
 */

import { validateSession } from './auth'

const isDev = process.env.NODE_ENV !== 'production'

type ErrorResponseOptions = {
  status?: number
}

/**
 * Create an error response with dev-friendly details in development mode.
 */
export function errorResponse(
  message: string,
  error: unknown,
  options: ErrorResponseOptions = {},
): Response {
  const { status = 500 } = options

  console.error(`[API Error] ${message}:`, error)

  return Response.json(
    {
      success: false,
      error: message,
      ...(isDev && {
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    },
    { status },
  )
}

/**
 * Create a success response.
 */
export function successResponse<T extends object>(
  data: T,
  status = 200,
): Response {
  return Response.json({ success: true, ...data }, { status })
}

/**
 * Create a simple error response without exception details.
 */
export function simpleErrorResponse(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status })
}

// ============================================================================
// Sanitization Utilities
// ============================================================================

/**
 * Convert empty strings to null for optional database fields.
 */
export function emptyToNull(val: string | undefined | null): string | null {
  return val === '' || val === undefined || val === null ? null : val
}

/**
 * Sanitize product input, converting empty strings to null for nullable fields.
 */
export function sanitizeProductFields(input: Record<string, unknown>) {
  return {
    vendor: emptyToNull(input.vendor as string),
    productType: emptyToNull(input.productType as string),
    price: emptyToNull(input.price as string),
    compareAtPrice: emptyToNull(input.compareAtPrice as string),
    sku: emptyToNull(input.sku as string),
    barcode: emptyToNull(input.barcode as string),
    weight: emptyToNull(input.weight as string),
    inventoryQuantity: (input.inventoryQuantity as number) ?? 0,
  }
}

// ============================================================================
// Auth Middleware
// ============================================================================

type AuthResult =
  | { success: true; user: { id: string; email: string; role: string } }
  | { success: false; response: Response }

/**
 * Validate session and return user or error response.
 * Use in API handlers to reduce auth boilerplate.
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const auth = await validateSession(request)
  if (!auth.success) {
    return {
      success: false,
      response: simpleErrorResponse(auth.error || 'Unauthorized', auth.status),
    }
  }
  return { success: true, user: auth.user }
}
