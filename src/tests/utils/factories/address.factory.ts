import type { AddressSnapshot } from '../../../db/schema'
import type { AddressInput } from '../../../types/checkout'
import type { CustomerAddress } from '../../../types/order'

/**
 * Creates a valid AddressSnapshot with sensible defaults.
 * Use overrides to customize specific fields for your test case.
 */
export function createAddress(
  overrides: Partial<AddressSnapshot> = {},
): AddressSnapshot {
  return {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main Street',
    city: 'New York',
    province: 'New York',
    provinceCode: 'NY',
    country: 'United States',
    countryCode: 'US',
    zip: '10001',
    ...overrides,
  }
}

/**
 * Creates a valid AddressInput for form submissions.
 */
export function createAddressInput(
  overrides: Partial<AddressInput> = {},
): AddressInput {
  return {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main Street',
    city: 'New York',
    province: 'New York',
    provinceCode: 'NY',
    country: 'United States',
    countryCode: 'US',
    zip: '10001',
    ...overrides,
  }
}

/**
 * Creates a CustomerAddress with database fields.
 */
export function createCustomerAddress(
  overrides: Partial<CustomerAddress> = {},
): CustomerAddress {
  return {
    id: 'addr-123',
    customerId: 'cust-123',
    type: 'shipping',
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main Street',
    city: 'New York',
    province: 'New York',
    provinceCode: 'NY',
    country: 'United States',
    countryCode: 'US',
    zip: '10001',
    isDefault: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

/**
 * Pre-configured address variants for common test scenarios.
 */
export const addressVariants = {
  /** US address (default) */
  us: () => createAddress(),

  /** Canadian address */
  canada: () =>
    createAddress({
      address1: '456 Maple Avenue',
      city: 'Toronto',
      province: 'Ontario',
      provinceCode: 'ON',
      country: 'Canada',
      countryCode: 'CA',
      zip: 'M5V 2T6',
    }),

  /** UK address */
  uk: () =>
    createAddress({
      address1: '10 Downing Street',
      city: 'London',
      province: 'Greater London',
      provinceCode: '',
      country: 'United Kingdom',
      countryCode: 'GB',
      zip: 'SW1A 2AA',
    }),

  /** Address with company */
  withCompany: () =>
    createAddress({
      company: 'Acme Corporation',
    }),

  /** Address with apartment/suite */
  withApartment: () =>
    createAddress({
      address2: 'Apt 4B',
    }),

  /** Minimal valid address (no optional fields) */
  minimal: () =>
    createAddress({
      company: undefined,
      address2: undefined,
      province: undefined,
      provinceCode: undefined,
      phone: undefined,
    }),
}
