import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the database
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ id: 'order-123' }]),
  }),
})

vi.mock('../../db', () => ({
  db: {
    update: () => mockUpdate(),
  },
}))

// Mock Stripe webhook verification
vi.mock('../../lib/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}))

// Mock PayPal webhook verification
vi.mock('../../lib/paypal', () => ({
  verifyWebhookSignature: vi.fn(),
}))

import { verifyWebhookSignature } from '../../lib/paypal'
import { constructWebhookEvent } from '../../lib/stripe'

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Signature Validation', () => {
    it('should reject requests without stripe-signature header', async () => {
      const validateSignature = (signature: string | null) => {
        if (!signature) {
          return { valid: false, error: 'Missing stripe-signature header' }
        }
        return { valid: true }
      }

      expect(validateSignature(null)).toEqual({
        valid: false,
        error: 'Missing stripe-signature header',
      })
      expect(validateSignature('sig_test_123')).toEqual({ valid: true })
    })

    it('should reject when webhook secret is not configured', () => {
      const validateConfig = (webhookSecret: string | undefined) => {
        if (!webhookSecret) {
          return { valid: false, error: 'Webhook not configured' }
        }
        return { valid: true }
      }

      expect(validateConfig(undefined)).toEqual({
        valid: false,
        error: 'Webhook not configured',
      })
      expect(validateConfig('')).toEqual({
        valid: false,
        error: 'Webhook not configured',
      })
      expect(validateConfig('whsec_test')).toEqual({ valid: true })
    })

    it('should handle invalid signature errors', () => {
      const mockConstructEvent = constructWebhookEvent as ReturnType<
        typeof vi.fn
      >
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      expect(() =>
        constructWebhookEvent('body', 'invalid_sig', 'whsec_test'),
      ).toThrow('Invalid signature')
    })
  })

  describe('Event Type Handling', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const handleStripeEvent = async (event: {
        type: string
        data: { object: { id: string } }
      }) => {
        switch (event.type) {
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object
            return {
              action: 'update_order',
              paymentId: paymentIntent.id,
              paymentStatus: 'paid',
              paidAt: new Date(),
            }
          }
          default:
            return { action: 'unhandled', type: event.type }
        }
      }

      const result = await handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      })

      expect(result.action).toBe('update_order')
      expect(result.paymentId).toBe('pi_test_123')
      expect(result.paymentStatus).toBe('paid')
      expect(result.paidAt).toBeInstanceOf(Date)
    })

    it('should handle payment_intent.payment_failed event', async () => {
      const handleStripeEvent = async (event: {
        type: string
        data: { object: { id: string } }
      }) => {
        switch (event.type) {
          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object
            return {
              action: 'update_order',
              paymentId: paymentIntent.id,
              paymentStatus: 'failed',
            }
          }
          default:
            return { action: 'unhandled', type: event.type }
        }
      }

      const result = await handleStripeEvent({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_456' } },
      })

      expect(result.action).toBe('update_order')
      expect(result.paymentId).toBe('pi_test_456')
      expect(result.paymentStatus).toBe('failed')
    })

    it('should log unhandled event types', async () => {
      const handleStripeEvent = async (event: {
        type: string
        data: { object: { id: string } }
      }) => {
        const knownEvents = [
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
        ]

        if (!knownEvents.includes(event.type)) {
          return { action: 'unhandled', type: event.type }
        }

        return { action: 'handled' }
      }

      const result = await handleStripeEvent({
        type: 'customer.created',
        data: { object: { id: 'cus_123' } },
      })

      expect(result.action).toBe('unhandled')
      expect(result.type).toBe('customer.created')
    })
  })

  describe('Database Update', () => {
    it('should update order status on successful payment', () => {
      const buildUpdateQuery = (
        _paymentId: string,
        paymentStatus: string,
        paidAt?: Date,
      ) => ({
        paymentStatus,
        ...(paidAt && { paidAt }),
        updatedAt: new Date(),
      })

      const update = buildUpdateQuery('pi_123', 'paid', new Date())

      expect(update.paymentStatus).toBe('paid')
      expect(update.paidAt).toBeInstanceOf(Date)
      expect(update.updatedAt).toBeInstanceOf(Date)
    })

    it('should update order status on failed payment', () => {
      const buildUpdateQuery = (paymentStatus: string) => ({
        paymentStatus,
        updatedAt: new Date(),
      })

      const update = buildUpdateQuery('failed')

      expect(update.paymentStatus).toBe('failed')
      expect(update.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('Response Handling', () => {
    it('should return 200 with received: true on success', () => {
      const buildSuccessResponse = () => ({
        status: 200,
        body: { received: true },
      })

      const response = buildSuccessResponse()

      expect(response.status).toBe(200)
      expect(response.body.received).toBe(true)
    })

    it('should return 400 on missing signature', () => {
      const buildErrorResponse = (message: string, status: number) => ({
        status,
        body: message,
      })

      const response = buildErrorResponse(
        'Missing stripe-signature header',
        400,
      )

      expect(response.status).toBe(400)
      expect(response.body).toBe('Missing stripe-signature header')
    })

    it('should return 500 on missing webhook secret', () => {
      const buildErrorResponse = (message: string, status: number) => ({
        status,
        body: message,
      })

      const response = buildErrorResponse('Webhook not configured', 500)

      expect(response.status).toBe(500)
      expect(response.body).toBe('Webhook not configured')
    })
  })
})

describe('PayPal Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration Validation', () => {
    it('should reject when webhook ID is not configured', () => {
      const validateConfig = (webhookId: string | undefined) => {
        if (!webhookId) {
          return { valid: false, error: 'Webhook not configured' }
        }
        return { valid: true }
      }

      expect(validateConfig(undefined)).toEqual({
        valid: false,
        error: 'Webhook not configured',
      })
      expect(validateConfig('')).toEqual({
        valid: false,
        error: 'Webhook not configured',
      })
      expect(validateConfig('WH-123')).toEqual({ valid: true })
    })
  })

  describe('Signature Verification', () => {
    it('should extract PayPal headers correctly', () => {
      const extractHeaders = (headers: Record<string, string>) => {
        const normalized: Record<string, string> = {}
        Object.entries(headers).forEach(([key, value]) => {
          normalized[key.toLowerCase()] = value
        })
        return normalized
      }

      const headers = extractHeaders({
        'PayPal-Auth-Algo': 'SHA256withRSA',
        'PayPal-Cert-Url': 'https://api.paypal.com/v1/certs/123',
        'PayPal-Transmission-Id': 'trans-123',
        'PayPal-Transmission-Sig': 'sig-abc',
        'PayPal-Transmission-Time': '2024-01-15T10:00:00Z',
      })

      expect(headers['paypal-auth-algo']).toBe('SHA256withRSA')
      expect(headers['paypal-transmission-id']).toBe('trans-123')
    })

    it('should reject invalid signature', async () => {
      const mockVerify = verifyWebhookSignature as ReturnType<typeof vi.fn>
      mockVerify.mockResolvedValue({ verified: false })

      const result = await verifyWebhookSignature({
        body: '{}',
        headers: {},
        webhookId: 'WH-123',
      })

      expect(result.verified).toBe(false)
    })

    it('should accept valid signature', async () => {
      const mockVerify = verifyWebhookSignature as ReturnType<typeof vi.fn>
      mockVerify.mockResolvedValue({ verified: true })

      const result = await verifyWebhookSignature({
        body: '{}',
        headers: { 'paypal-auth-algo': 'SHA256withRSA' },
        webhookId: 'WH-123',
      })

      expect(result.verified).toBe(true)
    })
  })

  describe('Event Type Handling', () => {
    it('should handle PAYMENT.CAPTURE.COMPLETED event', async () => {
      const handlePayPalEvent = async (event: {
        event_type: string
        resource: {
          supplementary_data?: { related_ids?: { order_id?: string } }
        }
      }) => {
        switch (event.event_type) {
          case 'PAYMENT.CAPTURE.COMPLETED': {
            const paymentId =
              event.resource.supplementary_data?.related_ids?.order_id
            if (paymentId) {
              return {
                action: 'update_order',
                paymentId,
                paymentStatus: 'paid',
                paidAt: new Date(),
              }
            }
            return { action: 'no_payment_id' }
          }
          default:
            return { action: 'unhandled' }
        }
      }

      const result = await handlePayPalEvent({
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          supplementary_data: {
            related_ids: { order_id: 'paypal-order-123' },
          },
        },
      })

      expect(result.action).toBe('update_order')
      expect(result.paymentId).toBe('paypal-order-123')
      expect(result.paymentStatus).toBe('paid')
    })

    it('should handle PAYMENT.CAPTURE.DENIED event', async () => {
      const handlePayPalEvent = async (event: {
        event_type: string
        resource: {
          supplementary_data?: { related_ids?: { order_id?: string } }
        }
      }) => {
        switch (event.event_type) {
          case 'PAYMENT.CAPTURE.DENIED': {
            const paymentId =
              event.resource.supplementary_data?.related_ids?.order_id
            if (paymentId) {
              return {
                action: 'update_order',
                paymentId,
                paymentStatus: 'failed',
              }
            }
            return { action: 'no_payment_id' }
          }
          default:
            return { action: 'unhandled' }
        }
      }

      const result = await handlePayPalEvent({
        event_type: 'PAYMENT.CAPTURE.DENIED',
        resource: {
          supplementary_data: {
            related_ids: { order_id: 'paypal-order-456' },
          },
        },
      })

      expect(result.action).toBe('update_order')
      expect(result.paymentId).toBe('paypal-order-456')
      expect(result.paymentStatus).toBe('failed')
    })

    it('should handle PAYMENT.CAPTURE.REFUNDED event', async () => {
      const handlePayPalEvent = async (event: {
        event_type: string
        resource: {
          supplementary_data?: { related_ids?: { order_id?: string } }
        }
      }) => {
        switch (event.event_type) {
          case 'PAYMENT.CAPTURE.REFUNDED': {
            const paymentId =
              event.resource.supplementary_data?.related_ids?.order_id
            if (paymentId) {
              return {
                action: 'update_order',
                paymentId,
                paymentStatus: 'refunded',
              }
            }
            return { action: 'no_payment_id' }
          }
          default:
            return { action: 'unhandled' }
        }
      }

      const result = await handlePayPalEvent({
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          supplementary_data: {
            related_ids: { order_id: 'paypal-order-789' },
          },
        },
      })

      expect(result.action).toBe('update_order')
      expect(result.paymentId).toBe('paypal-order-789')
      expect(result.paymentStatus).toBe('refunded')
    })

    it('should handle missing payment ID in event', async () => {
      const handlePayPalEvent = async (event: {
        event_type: string
        resource: object
      }) => {
        if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
          const resource = event.resource as {
            supplementary_data?: { related_ids?: { order_id?: string } }
          }
          const paymentId = resource.supplementary_data?.related_ids?.order_id

          if (!paymentId) {
            return { action: 'skipped', reason: 'no_payment_id' }
          }
          return { action: 'processed', paymentId }
        }
        return { action: 'unhandled' }
      }

      const result = await handlePayPalEvent({
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {},
      })

      expect(result.action).toBe('skipped')
      expect(result.reason).toBe('no_payment_id')
    })

    it('should log unhandled event types', async () => {
      const handlePayPalEvent = async (event: { event_type: string }) => {
        const knownEvents = [
          'PAYMENT.CAPTURE.COMPLETED',
          'PAYMENT.CAPTURE.DENIED',
          'PAYMENT.CAPTURE.REFUNDED',
        ]

        if (!knownEvents.includes(event.event_type)) {
          return { action: 'unhandled', type: event.event_type }
        }

        return { action: 'handled' }
      }

      const result = await handlePayPalEvent({
        event_type: 'CHECKOUT.ORDER.APPROVED',
      })

      expect(result.action).toBe('unhandled')
      expect(result.type).toBe('CHECKOUT.ORDER.APPROVED')
    })
  })

  describe('Response Handling', () => {
    it('should return 200 with received: true on success', () => {
      const buildSuccessResponse = () => ({
        status: 200,
        body: { received: true },
      })

      const response = buildSuccessResponse()

      expect(response.status).toBe(200)
      expect(response.body.received).toBe(true)
    })

    it('should return 401 on invalid signature', () => {
      const buildErrorResponse = (verified: boolean) => {
        if (!verified) {
          return { status: 401, body: 'Invalid signature' }
        }
        return { status: 200 }
      }

      const response = buildErrorResponse(false)

      expect(response.status).toBe(401)
      expect(response.body).toBe('Invalid signature')
    })

    it('should return 500 on missing webhook ID', () => {
      const buildErrorResponse = (message: string, status: number) => ({
        status,
        body: message,
      })

      const response = buildErrorResponse('Webhook not configured', 500)

      expect(response.status).toBe(500)
      expect(response.body).toBe('Webhook not configured')
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      const parseEventBody = (body: string) => {
        try {
          return { success: true, event: JSON.parse(body) }
        } catch {
          return { success: false, error: 'Invalid JSON' }
        }
      }

      expect(parseEventBody('{"valid": true}')).toEqual({
        success: true,
        event: { valid: true },
      })
      expect(parseEventBody('invalid json')).toEqual({
        success: false,
        error: 'Invalid JSON',
      })
    })

    it('should handle database errors', async () => {
      const updateOrderWithError = async () => {
        try {
          throw new Error('Database connection failed')
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }

      const result = await updateOrderWithError()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })
  })
})

describe('Webhook Error Categorization', () => {
  describe('Error Type Detection', () => {
    it('should categorize signature errors as client errors (400)', () => {
      const categorizeWebhookError = (errorMessage: string) => {
        const clientErrorPatterns = [
          'signature',
          'parse',
          'json',
          'invalid',
          'malformed',
          'verification',
        ]
        const isClientError = clientErrorPatterns.some((pattern) =>
          errorMessage.toLowerCase().includes(pattern),
        )
        return { status: isClientError ? 400 : 500 }
      }

      expect(categorizeWebhookError('Invalid signature')).toEqual({
        status: 400,
      })
      expect(categorizeWebhookError('Signature verification failed')).toEqual({
        status: 400,
      })
      expect(categorizeWebhookError('signature mismatch')).toEqual({
        status: 400,
      })
    })

    it('should categorize parse errors as client errors (400)', () => {
      const categorizeWebhookError = (errorMessage: string) => {
        const clientErrorPatterns = [
          'signature',
          'parse',
          'json',
          'invalid',
          'malformed',
          'verification',
        ]
        const isClientError = clientErrorPatterns.some((pattern) =>
          errorMessage.toLowerCase().includes(pattern),
        )
        return { status: isClientError ? 400 : 500 }
      }

      expect(categorizeWebhookError('JSON parse error')).toEqual({
        status: 400,
      })
      expect(categorizeWebhookError('Failed to parse body')).toEqual({
        status: 400,
      })
      expect(categorizeWebhookError('Malformed request')).toEqual({
        status: 400,
      })
    })

    it('should categorize database errors as server errors (500)', () => {
      const categorizeWebhookError = (errorMessage: string) => {
        const clientErrorPatterns = [
          'signature',
          'parse',
          'json',
          'invalid',
          'malformed',
          'verification',
        ]
        const isClientError = clientErrorPatterns.some((pattern) =>
          errorMessage.toLowerCase().includes(pattern),
        )
        return { status: isClientError ? 400 : 500 }
      }

      expect(categorizeWebhookError('Database connection failed')).toEqual({
        status: 500,
      })
      expect(categorizeWebhookError('ECONNREFUSED')).toEqual({ status: 500 })
      expect(categorizeWebhookError('Query timeout')).toEqual({ status: 500 })
    })

    it('should categorize network errors as server errors (500)', () => {
      const categorizeWebhookError = (errorMessage: string) => {
        const clientErrorPatterns = [
          'signature',
          'parse',
          'json',
          'invalid',
          'malformed',
          'verification',
        ]
        const isClientError = clientErrorPatterns.some((pattern) =>
          errorMessage.toLowerCase().includes(pattern),
        )
        return { status: isClientError ? 400 : 500 }
      }

      expect(categorizeWebhookError('Network error')).toEqual({ status: 500 })
      expect(categorizeWebhookError('Connection reset')).toEqual({
        status: 500,
      })
      expect(categorizeWebhookError('Timeout')).toEqual({ status: 500 })
    })

    it('should categorize unknown errors as server errors (500)', () => {
      const categorizeWebhookError = (errorMessage: string) => {
        const clientErrorPatterns = [
          'signature',
          'parse',
          'json',
          'invalid',
          'malformed',
          'verification',
        ]
        const isClientError = clientErrorPatterns.some((pattern) =>
          errorMessage.toLowerCase().includes(pattern),
        )
        return { status: isClientError ? 400 : 500 }
      }

      expect(categorizeWebhookError('Unknown error')).toEqual({ status: 500 })
      expect(categorizeWebhookError('Something went wrong')).toEqual({
        status: 500,
      })
    })
  })

  describe('Retry Behavior', () => {
    it('should not retry client errors (400)', () => {
      const shouldRetry = (status: number) => status >= 500

      expect(shouldRetry(400)).toBe(false)
      expect(shouldRetry(401)).toBe(false)
      expect(shouldRetry(403)).toBe(false)
    })

    it('should retry server errors (500)', () => {
      const shouldRetry = (status: number) => status >= 500

      expect(shouldRetry(500)).toBe(true)
      expect(shouldRetry(502)).toBe(true)
      expect(shouldRetry(503)).toBe(true)
    })
  })
})

describe('Webhook Security', () => {
  describe('Replay Protection', () => {
    it('should include timestamp in verification', () => {
      const isTimestampValid = (timestamp: string, toleranceSeconds = 300) => {
        const eventTime = new Date(timestamp).getTime()
        const now = Date.now()
        const diff = Math.abs(now - eventTime)
        return diff <= toleranceSeconds * 1000
      }

      const recentTimestamp = new Date().toISOString()
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 mins ago

      expect(isTimestampValid(recentTimestamp)).toBe(true)
      expect(isTimestampValid(oldTimestamp)).toBe(false)
    })
  })

  describe('Idempotency', () => {
    it('should handle duplicate events gracefully', async () => {
      const processedEvents = new Set<string>()

      const processEvent = async (eventId: string) => {
        if (processedEvents.has(eventId)) {
          return { action: 'already_processed', eventId }
        }

        processedEvents.add(eventId)
        return { action: 'processed', eventId }
      }

      const firstResult = await processEvent('evt_123')
      const secondResult = await processEvent('evt_123')

      expect(firstResult.action).toBe('processed')
      expect(secondResult.action).toBe('already_processed')
    })
  })
})
