import type { ValidationResult } from './checkout'
import type { AddressSnapshot } from '../../db/schema'

/**
 * Input type for address validation.
 * All fields are optional for validation - we check required ones.
 */
export interface AddressInput {
  firstName?: string
  lastName?: string
  address1?: string
  city?: string
  country?: string
  countryCode?: string
  zip?: string
  // Optional fields (not validated for presence)
  company?: string
  address2?: string
  province?: string
  provinceCode?: string
  phone?: string
}

/**
 * Validates all required address fields.
 * Returns first error found (same behavior as current route).
 *
 * @example
 * ```typescript
 * const result = validateAddressFields(body)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * ```
 */
export function validateAddressFields(address: AddressInput): ValidationResult {
  if (!address.firstName?.trim()) {
    return { valid: false, error: 'First name is required', status: 400 }
  }

  if (!address.lastName?.trim()) {
    return { valid: false, error: 'Last name is required', status: 400 }
  }

  if (!address.address1?.trim()) {
    return { valid: false, error: 'Address is required', status: 400 }
  }

  if (!address.city?.trim()) {
    return { valid: false, error: 'City is required', status: 400 }
  }

  if (!address.country?.trim() || !address.countryCode?.trim()) {
    return { valid: false, error: 'Country is required', status: 400 }
  }

  if (!address.zip?.trim()) {
    return { valid: false, error: 'ZIP/Postal code is required', status: 400 }
  }

  return { valid: true }
}

/**
 * Normalizes address input into AddressSnapshot.
 * Trims all values and converts empty strings to undefined for optional fields.
 *
 * @example
 * ```typescript
 * const result = validateAddressFields(body)
 * if (!result.valid) {
 *   return simpleErrorResponse(result.error)
 * }
 * const shippingAddress = normalizeAddress(body)
 * ```
 */
export function normalizeAddress(address: AddressInput): AddressSnapshot {
  return {
    firstName: address.firstName!.trim(),
    lastName: address.lastName!.trim(),
    company: address.company?.trim() || undefined,
    address1: address.address1!.trim(),
    address2: address.address2?.trim() || undefined,
    city: address.city!.trim(),
    province: address.province?.trim() || undefined,
    provinceCode: address.provinceCode?.trim() || undefined,
    country: address.country!.trim(),
    countryCode: address.countryCode!.trim(),
    zip: address.zip!.trim(),
    phone: address.phone?.trim() || undefined,
  }
}
