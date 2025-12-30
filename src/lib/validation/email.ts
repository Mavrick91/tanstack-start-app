import type { ValidationResult } from './checkout'

/**
 * Email regex pattern - matches standard email format.
 * Same pattern used in existing routes.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates that an email is present and not empty.
 *
 * @example
 * ```typescript
 * const result = validateEmailRequired(email)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * ```
 */
export function validateEmailRequired(
  email: string | null | undefined,
): ValidationResult {
  if (!email?.trim()) {
    return { valid: false, error: 'Email is required', status: 400 }
  }
  return { valid: true }
}

/**
 * Validates email format using regex.
 * Assumes email is already validated as present.
 *
 * @example
 * ```typescript
 * const result = validateEmailFormat(email)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * ```
 */
export function validateEmailFormat(email: string): ValidationResult {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format', status: 400 }
  }
  return { valid: true }
}

/**
 * Full email validation - checks presence and format.
 * Use this for a single comprehensive validation.
 *
 * @example
 * ```typescript
 * const result = validateEmail(body.email)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * ```
 */
export function validateEmail(
  email: string | null | undefined,
): ValidationResult {
  const requiredResult = validateEmailRequired(email)
  if (!requiredResult.valid) {
    return requiredResult
  }

  return validateEmailFormat(email!)
}

/**
 * Normalizes email to lowercase.
 * Use after validation to ensure consistent storage.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
