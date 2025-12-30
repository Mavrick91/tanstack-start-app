export interface PasswordValidationResult {
  valid: boolean
  error?: string
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password too long' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' }
  }

  return { valid: true }
}
