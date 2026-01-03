import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock SendGrid before importing
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}))

import {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
} from './email'

describe('Email Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isEmailConfigured', () => {
    it('should return false when SENDGRID_API_KEY is not set', () => {
      delete process.env.SENDGRID_API_KEY
      expect(isEmailConfigured()).toBe(false)
    })

    it('should return true when SENDGRID_API_KEY is set', () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'
      expect(isEmailConfigured()).toBe(true)
    })
  })

  describe('sendOrderConfirmationEmail', () => {
    it('should send order confirmation email successfully', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'

      const order = {
        id: 'order-123',
        orderNumber: 1001,
        email: 'customer@example.com',
        total: 99.99,
        currency: 'USD',
        items: [
          {
            title: 'Nail Art Set',
            variantTitle: 'Pink / Medium',
            quantity: 2,
            price: 29.99,
          },
        ],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          country: 'United States',
          countryCode: 'US',
          zip: '90001',
        },
      }

      const result = await sendOrderConfirmationEmail(order)
      expect(result.success).toBe(true)
    })

    it('should return error when SendGrid is not configured', async () => {
      delete process.env.SENDGRID_API_KEY

      const order = {
        id: 'order-123',
        orderNumber: 1001,
        email: 'customer@example.com',
        total: 99.99,
        currency: 'USD',
        items: [],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          country: 'United States',
          countryCode: 'US',
          zip: '90001',
        },
      }

      const result = await sendOrderConfirmationEmail(order)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
    })

    it('should handle missing customer email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'

      const order = {
        id: 'order-123',
        orderNumber: 1001,
        email: '',
        total: 99.99,
        currency: 'USD',
        items: [],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          country: 'United States',
          countryCode: 'US',
          zip: '90001',
        },
      }

      const result = await sendOrderConfirmationEmail(order)
      expect(result.success).toBe(false)
      expect(result.error).toContain('email')
    })
  })

  describe('sendShippingUpdateEmail', () => {
    it('should send shipping update email successfully', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'

      const data = {
        email: 'customer@example.com',
        orderNumber: 1001,
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        estimatedDelivery: '2024-01-20',
      }

      const result = await sendShippingUpdateEmail(data)
      expect(result.success).toBe(true)
    })

    it('should return error when SendGrid is not configured', async () => {
      delete process.env.SENDGRID_API_KEY

      const data = {
        email: 'customer@example.com',
        orderNumber: 1001,
      }

      const result = await sendShippingUpdateEmail(data)
      expect(result.success).toBe(false)
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key'

      const result = await sendPasswordResetEmail({
        email: 'user@example.com',
        resetToken: 'abc123def456',
        resetUrl: 'https://finenailseason.com/reset?token=abc123def456',
      })

      expect(result.success).toBe(true)
    })

    it('should return error when SendGrid is not configured', async () => {
      delete process.env.SENDGRID_API_KEY

      const result = await sendPasswordResetEmail({
        email: 'user@example.com',
        resetToken: 'abc123def456',
        resetUrl: 'https://finenailseason.com/reset?token=abc123def456',
      })

      expect(result.success).toBe(false)
    })
  })
})
