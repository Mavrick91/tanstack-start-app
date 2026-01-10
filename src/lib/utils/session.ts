// Cookie and session utilities
// Provides helpers for HTTP-only session cookie management

import {
  SESSION_DURATION_MS,
  SESSION_DURATION_SECONDS,
} from '../../server/session'

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
  maxAge = SESSION_DURATION_SECONDS,
) =>
  `session=${sessionId}; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=${maxAge}`

export const clearSessionCookie = () =>
  `session=; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=0`

// Default uses SESSION_DURATION_MS, or pass custom days
export const getSessionExpiry = (durationMs = SESSION_DURATION_MS) =>
  new Date(Date.now() + durationMs)
