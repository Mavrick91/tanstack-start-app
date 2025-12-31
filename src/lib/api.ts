import { getCookie, validateSession } from './auth'
import { validateCsrf } from './csrf'
import { securityHeaders } from './security-headers'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Apply security headers to a Response
 */
export const withSecurityHeaders = (response: Response) => {
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

export const errorResponse = (
  message: string,
  error: unknown,
  status = 500,
) => {
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

export const successResponse = <T extends object>(data: T, status = 200) => {
  return withSecurityHeaders(
    Response.json({ success: true, ...data }, { status }),
  )
}

export const simpleErrorResponse = (message: string, status = 400) => {
  return withSecurityHeaders(
    Response.json({ success: false, error: message }, { status }),
  )
}

export const emptyToNull = (val: string | undefined | null) => {
  return val === '' || val === undefined || val === null ? null : val
}

export const sanitizeProductFields = (input: Record<string, unknown>) => {
  return {
    vendor: emptyToNull(input.vendor as string),
    productType: emptyToNull(input.productType as string),
  }
}

export const requireAuth = async (request: Request) => {
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

export const requireAdmin = async (request: Request) => {
  const auth = await requireAuth(request)
  if (!auth.success) {
    return auth
  }

  if (!auth.user || auth.user.role !== 'admin') {
    return {
      success: false,
      response: simpleErrorResponse('Forbidden', 403),
    }
  }

  return auth
}
