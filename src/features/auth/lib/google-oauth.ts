const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export const getGoogleAuthUrl = (returnUrl?: string): string => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnUrl || '/en/account',
    access_type: 'offline',
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export const exchangeCodeForTokens = async (
  code: string,
): Promise<{
  access_token: string
  id_token: string
  refresh_token?: string
}> => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  return response.json()
}

export const getGoogleUser = async (
  accessToken: string,
): Promise<{
  id: string
  email: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google user info')
  }

  return response.json()
}
