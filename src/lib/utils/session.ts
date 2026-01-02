/**
 * Cookie and session utilities.
 * Provides helpers for HTTP-only session cookie management.
 */

export const getCookie = (
  request: Request,
  name: string,
): string | undefined => {
  const cookies = request.headers.get('cookie')
  if (!cookies) return undefined

  const match = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))

  return match ? match.split('=')[1] : undefined
}

const isProduction = process.env.NODE_ENV === 'production'
const secureFlag = isProduction ? ' Secure;' : ''

export const createSessionCookie = (
  sessionId: string,
  maxAge = 7 * 24 * 60 * 60,
) =>
  `session=${sessionId}; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=${maxAge}`

export const clearSessionCookie = () =>
  `session=; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=0`

export const getSessionExpiry = (days = 7) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000)
