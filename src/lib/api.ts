import { getCookie, validateSession } from './auth'
import { validateCsrf } from './csrf'
import { securityHeaders } from './security-headers'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Apply security headers to a Response
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function errorResponse(
  message: string,
  error: unknown,
  status = 500,
): Response {
  console.error(`[API Error] ${message}:`, error)

  return withSecurityHeaders(
    Response.json(
      {
        success: false,
        error: message,
        ...(isDev && {
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status },
    ),
  )
}

export function successResponse<T extends object>(
  data: T,
  status = 200,
): Response {
  return withSecurityHeaders(
    Response.json({ success: true, ...data }, { status }),
  )
}

export function simpleErrorResponse(message: string, status = 400): Response {
  return withSecurityHeaders(
    Response.json({ success: false, error: message }, { status }),
  )
}

export function emptyToNull(val: string | undefined | null): string | null {
  return val === '' || val === undefined || val === null ? null : val
}

export function sanitizeProductFields(input: Record<string, unknown>) {
  return {
    vendor: emptyToNull(input.vendor as string),
    productType: emptyToNull(input.productType as string),
  }
}

type AuthResult =
  | { success: true; user: { id: string; email: string; role: string } }
  | { success: false; response: Response }

export async function requireAuth(request: Request): Promise<AuthResult> {
  // Validate CSRF for state-changing methods
  const sessionId = getCookie(request, 'session')
  const csrfError = validateCsrf(request, sessionId)
  if (csrfError) {
    return { success: false, response: csrfError }
  }

  const auth = await validateSession(request)
  if (!auth.success) {
    return {
      success: false,
      response: simpleErrorResponse(auth.error || 'Unauthorized', auth.status),
    }
  }
  return { success: true, user: auth.user }
}

export async function requireAdmin(request: Request): Promise<AuthResult> {
  const auth = await requireAuth(request)
  if (!auth.success) {
    return auth
  }

  if (auth.user.role !== 'admin') {
    return {
      success: false,
      response: simpleErrorResponse('Forbidden', 403),
    }
  }

  return auth
}
