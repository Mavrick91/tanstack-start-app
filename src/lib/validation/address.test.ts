import { describe, expect, it } from 'vitest'

import { validateAddressFields, normalizeAddress } from './address'

import type { AddressInput } from './address'

/**
 * Helper to create a valid address input for tests.
 */
function createAddressInput(
  overrides: Partial<AddressInput> = {},
): AddressInput {
  return {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main St',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    zip: '10001',
    ...overrides,
  }
}

describe('Address Validation', () => {
  describe('validateAddressFields', () => {
    it('returns valid for complete address', () => {
      const address = createAddressInput()

      const result = validateAddressFields(address)

      expect(result).toEqual({ valid: true })
    })

    it('returns valid for address with all optional fields', () => {
      const address = createAddressInput({
        company: 'Acme Inc',
        address2: 'Suite 100',
        province: 'NY',
        provinceCode: 'NY',
        phone: '+1-555-123-4567',
      })

      const result = validateAddressFields(address)

      expect(result).toEqual({ valid: true })
    })

    describe('firstName validation', () => {
      it('returns error when firstName is missing', () => {
        const address = createAddressInput({ firstName: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'First name is required',
          status: 400,
        })
      })

      it('returns error when firstName is empty', () => {
        const address = createAddressInput({ firstName: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'First name is required',
          status: 400,
        })
      })

      it('returns error when firstName is whitespace', () => {
        const address = createAddressInput({ firstName: '   ' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'First name is required',
          status: 400,
        })
      })
    })

    describe('lastName validation', () => {
      it('returns error when lastName is missing', () => {
        const address = createAddressInput({ lastName: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Last name is required',
          status: 400,
        })
      })

      it('returns error when lastName is empty', () => {
        const address = createAddressInput({ lastName: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Last name is required',
          status: 400,
        })
      })
    })

    describe('address1 validation', () => {
      it('returns error when address1 is missing', () => {
        const address = createAddressInput({ address1: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Address is required',
          status: 400,
        })
      })

      it('returns error when address1 is empty', () => {
        const address = createAddressInput({ address1: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Address is required',
          status: 400,
        })
      })
    })

    describe('city validation', () => {
      it('returns error when city is missing', () => {
        const address = createAddressInput({ city: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'City is required',
          status: 400,
        })
      })

      it('returns error when city is empty', () => {
        const address = createAddressInput({ city: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'City is required',
          status: 400,
        })
      })
    })

    describe('country validation', () => {
      it('returns error when country is missing', () => {
        const address = createAddressInput({ country: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Country is required',
          status: 400,
        })
      })

      it('returns error when countryCode is missing', () => {
        const address = createAddressInput({ countryCode: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Country is required',
          status: 400,
        })
      })

      it('returns error when both country and countryCode are empty', () => {
        const address = createAddressInput({ country: '', countryCode: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'Country is required',
          status: 400,
        })
      })
    })

    describe('zip validation', () => {
      it('returns error when zip is missing', () => {
        const address = createAddressInput({ zip: undefined })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'ZIP/Postal code is required',
          status: 400,
        })
      })

      it('returns error when zip is empty', () => {
        const address = createAddressInput({ zip: '' })

        const result = validateAddressFields(address)

        expect(result).toEqual({
          valid: false,
          error: 'ZIP/Postal code is required',
          status: 400,
        })
      })
    })

    it('checks fields in order: firstName -> lastName -> address1 -> city -> country -> zip', () => {
      // All missing - should return first error
      const result = validateAddressFields({})

      expect((result as { error: string }).error).toBe('First name is required')
    })
  })

  describe('normalizeAddress', () => {
    it('trims all required fields', () => {
      const address = createAddressInput({
        firstName: '  John  ',
        lastName: '  Doe  ',
        address1: '  123 Main St  ',
        city: '  New York  ',
        country: '  United States  ',
        countryCode: '  US  ',
        zip: '  10001  ',
      })

      const result = normalizeAddress(address)

      expect(result.firstName).toBe('John')
      expect(result.lastName).toBe('Doe')
      expect(result.address1).toBe('123 Main St')
      expect(result.city).toBe('New York')
      expect(result.country).toBe('United States')
      expect(result.countryCode).toBe('US')
      expect(result.zip).toBe('10001')
    })

    it('includes optional fields when present', () => {
      const address = createAddressInput({
        company: 'Acme Inc',
        address2: 'Suite 100',
        province: 'NY',
        provinceCode: 'NY',
        phone: '+1-555-123-4567',
      })

      const result = normalizeAddress(address)

      expect(result.company).toBe('Acme Inc')
      expect(result.address2).toBe('Suite 100')
      expect(result.province).toBe('NY')
      expect(result.provinceCode).toBe('NY')
      expect(result.phone).toBe('+1-555-123-4567')
    })

    it('sets optional fields to undefined when empty', () => {
      const address = createAddressInput({
        company: '',
        address2: '',
        province: '',
        provinceCode: '',
        phone: '',
      })

      const result = normalizeAddress(address)

      expect(result.company).toBeUndefined()
      expect(result.address2).toBeUndefined()
      expect(result.province).toBeUndefined()
      expect(result.provinceCode).toBeUndefined()
      expect(result.phone).toBeUndefined()
    })

    it('sets optional fields to undefined when whitespace-only', () => {
      const address = createAddressInput({
        company: '   ',
        address2: '   ',
      })

      const result = normalizeAddress(address)

      expect(result.company).toBeUndefined()
      expect(result.address2).toBeUndefined()
    })

    it('trims optional fields when present', () => {
      const address = createAddressInput({
        company: '  Acme Inc  ',
        address2: '  Suite 100  ',
        province: '  NY  ',
        provinceCode: '  NY  ',
        phone: '  +1-555-123-4567  ',
      })

      const result = normalizeAddress(address)

      expect(result.company).toBe('Acme Inc')
      expect(result.address2).toBe('Suite 100')
      expect(result.province).toBe('NY')
      expect(result.provinceCode).toBe('NY')
      expect(result.phone).toBe('+1-555-123-4567')
    })

    it('returns AddressSnapshot type', () => {
      const address = createAddressInput()

      const result = normalizeAddress(address)

      // Verify it has all required AddressSnapshot fields
      expect(result).toHaveProperty('firstName')
      expect(result).toHaveProperty('lastName')
      expect(result).toHaveProperty('address1')
      expect(result).toHaveProperty('city')
      expect(result).toHaveProperty('country')
      expect(result).toHaveProperty('countryCode')
      expect(result).toHaveProperty('zip')
    })
  })
})
