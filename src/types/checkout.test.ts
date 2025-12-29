import { describe, expect, it } from 'vitest'

import {
  SHIPPING_RATES,
  FREE_SHIPPING_THRESHOLD,
  type CheckoutStep,
  type CheckoutCartItem,
  type CustomerInfoInput,
  type AddressInput,
  type ShippingRate,
  type PaymentProvider,
  type OrderStatus,
  type PaymentStatus,
  type FulfillmentStatus,
} from './checkout'

describe('Checkout Types and Constants', () => {
  describe('SHIPPING_RATES', () => {
    it('should have standard and express shipping options', () => {
      expect(SHIPPING_RATES).toHaveLength(2)
      expect(SHIPPING_RATES.map((r) => r.id)).toEqual(['standard', 'express'])
    })

    it('should have valid price values', () => {
      const standardRate = SHIPPING_RATES.find((r) => r.id === 'standard')
      const expressRate = SHIPPING_RATES.find((r) => r.id === 'express')

      expect(standardRate?.price).toBe(5.99)
      expect(expressRate?.price).toBe(14.99)
    })

    it('should have estimated delivery days', () => {
      SHIPPING_RATES.forEach((rate) => {
        expect(rate.estimatedDays).toBeDefined()
        expect(rate.estimatedDaysMin).toBeGreaterThan(0)
        expect(rate.estimatedDaysMax).toBeGreaterThanOrEqual(
          rate.estimatedDaysMin,
        )
      })
    })

    it('standard should be cheaper than express', () => {
      const standardRate = SHIPPING_RATES.find((r) => r.id === 'standard')
      const expressRate = SHIPPING_RATES.find((r) => r.id === 'express')

      expect(standardRate!.price).toBeLessThan(expressRate!.price)
    })

    it('express should have faster delivery', () => {
      const standardRate = SHIPPING_RATES.find((r) => r.id === 'standard')
      const expressRate = SHIPPING_RATES.find((r) => r.id === 'express')

      expect(expressRate!.estimatedDaysMax).toBeLessThan(
        standardRate!.estimatedDaysMin,
      )
    })
  })

  describe('FREE_SHIPPING_THRESHOLD', () => {
    it('should be a positive number', () => {
      expect(FREE_SHIPPING_THRESHOLD).toBeGreaterThan(0)
    })

    it('should be set to $75', () => {
      expect(FREE_SHIPPING_THRESHOLD).toBe(75.0)
    })
  })

  describe('Type Validation', () => {
    it('should allow valid CheckoutStep values', () => {
      const steps: CheckoutStep[] = [
        'information',
        'shipping',
        'payment',
        'confirmation',
      ]
      expect(steps).toHaveLength(4)
    })

    it('should allow valid PaymentProvider values', () => {
      const providers: PaymentProvider[] = ['stripe', 'paypal']
      expect(providers).toHaveLength(2)
    })

    it('should allow valid OrderStatus values', () => {
      const statuses: OrderStatus[] = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
      ]
      expect(statuses).toHaveLength(5)
    })

    it('should allow valid PaymentStatus values', () => {
      const statuses: PaymentStatus[] = [
        'pending',
        'paid',
        'failed',
        'refunded',
      ]
      expect(statuses).toHaveLength(4)
    })

    it('should allow valid FulfillmentStatus values', () => {
      const statuses: FulfillmentStatus[] = [
        'unfulfilled',
        'partial',
        'fulfilled',
      ]
      expect(statuses).toHaveLength(3)
    })
  })

  describe('CheckoutCartItem type', () => {
    it('should have required fields', () => {
      const item: CheckoutCartItem = {
        productId: 'prod-123',
        quantity: 2,
        title: 'Test Product',
        price: 29.99,
      }

      expect(item.productId).toBeDefined()
      expect(item.quantity).toBeDefined()
      expect(item.title).toBeDefined()
      expect(item.price).toBeDefined()
    })

    it('should allow optional fields', () => {
      const item: CheckoutCartItem = {
        productId: 'prod-123',
        variantId: 'var-456',
        quantity: 1,
        title: 'Test Product',
        variantTitle: 'Large / Blue',
        sku: 'SKU-001',
        price: 49.99,
        imageUrl: 'https://example.com/image.jpg',
      }

      expect(item.variantId).toBe('var-456')
      expect(item.variantTitle).toBe('Large / Blue')
      expect(item.sku).toBe('SKU-001')
      expect(item.imageUrl).toBe('https://example.com/image.jpg')
    })
  })

  describe('AddressInput type', () => {
    it('should have all required fields for a valid address', () => {
      const address: AddressInput = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        country: 'United States',
        countryCode: 'US',
        zip: '10001',
      }

      expect(address.firstName).toBe('John')
      expect(address.lastName).toBe('Doe')
      expect(address.address1).toBe('123 Main St')
      expect(address.city).toBe('New York')
      expect(address.country).toBe('United States')
      expect(address.countryCode).toBe('US')
      expect(address.zip).toBe('10001')
    })

    it('should allow optional fields', () => {
      const address: AddressInput = {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        address1: '123 Main St',
        address2: 'Suite 100',
        city: 'New York',
        province: 'NY',
        provinceCode: 'NY',
        country: 'United States',
        countryCode: 'US',
        zip: '10001',
        phone: '+1-555-123-4567',
      }

      expect(address.company).toBe('Acme Inc')
      expect(address.address2).toBe('Suite 100')
      expect(address.province).toBe('NY')
      expect(address.provinceCode).toBe('NY')
      expect(address.phone).toBe('+1-555-123-4567')
    })
  })

  describe('CustomerInfoInput type', () => {
    it('should require email', () => {
      const customerInfo: CustomerInfoInput = {
        email: 'test@example.com',
      }

      expect(customerInfo.email).toBe('test@example.com')
    })

    it('should allow optional account creation fields', () => {
      const customerInfo: CustomerInfoInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createAccount: true,
        password: 'securePassword123',
      }

      expect(customerInfo.firstName).toBe('John')
      expect(customerInfo.lastName).toBe('Doe')
      expect(customerInfo.createAccount).toBe(true)
      expect(customerInfo.password).toBe('securePassword123')
    })
  })

  describe('ShippingRate type', () => {
    it('should have required fields', () => {
      const rate: ShippingRate = {
        id: 'standard',
        name: 'Standard Shipping',
        price: 5.99,
        estimatedDays: '5-7 business days',
      }

      expect(rate.id).toBeDefined()
      expect(rate.name).toBeDefined()
      expect(rate.price).toBeDefined()
      expect(rate.estimatedDays).toBeDefined()
    })

    it('should allow optional fields', () => {
      const rate: ShippingRate = {
        id: 'free',
        name: 'Free Shipping',
        price: 0,
        estimatedDays: '5-7 business days',
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
        isFree: true,
      }

      expect(rate.estimatedDaysMin).toBe(5)
      expect(rate.estimatedDaysMax).toBe(7)
      expect(rate.isFree).toBe(true)
    })
  })
})
