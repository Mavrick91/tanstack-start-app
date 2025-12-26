import { validateSession } from './auth'

const isDev = process.env.NODE_ENV !== 'production'

export function errorResponse(
  message: string,
  error: unknown,
  status = 500,
): Response {
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

export function successResponse<T extends object>(
  data: T,
  status = 200,
): Response {
  return Response.json({ success: true, ...data }, { status })
}

export function simpleErrorResponse(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status })
}

export function emptyToNull(val: string | undefined | null): string | null {
  return val === '' || val === undefined || val === null ? null : val
}

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

type AuthResult =
  | { success: true; user: { id: string; email: string; role: string } }
  | { success: false; response: Response }

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
