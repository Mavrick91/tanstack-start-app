import { randomBytes, createHash } from 'crypto'

export type TokenType = 'verify_email' | 'reset_password'

/**
 * Generate a cryptographically secure random token (32 bytes = 64 hex chars)
 */
export const generateToken = (): string => {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token using SHA-256 for secure storage
 */
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate expiration date based on token type
 * - verify_email: 24 hours
 * - reset_password: 1 hour
 */
export const generateExpiresAt = (type: TokenType): Date => {
  const now = new Date()
  if (type === 'verify_email') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
  return new Date(now.getTime() + 60 * 60 * 1000)
}
