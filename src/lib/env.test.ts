import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset modules to clear cached env validation
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  describe('validateEnv', () => {
    it('should pass when all required env vars are set', async () => {
      process.env.DATABASE_URL = 'postgres://test'
      process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_xxx'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
      process.env.PAYPAL_CLIENT_ID = 'xxx'
      process.env.PAYPAL_CLIENT_SECRET = 'xxx'
      process.env.PAYPAL_WEBHOOK_ID = 'xxx'
      process.env.PAYPAL_MODE = 'sandbox'
      process.env.CLOUDINARY_CLOUD_NAME = 'xxx'
      process.env.CLOUDINARY_API_KEY = 'xxx'
      process.env.CLOUDINARY_API_SECRET = 'xxx'
      process.env.CHECKOUT_SECRET = 'test-secret'
      process.env.SESSION_SECRET =
        '3d56f86884dcd0b165170c8a8a3a453e7e5ec6328016879c4dd44dcc0ef9017a'

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).not.toThrow()
    })

    it('should throw when required env vars are missing', async () => {
      // Clear all env vars
      process.env = {}

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow(
        'Missing required environment variables',
      )
    })

    it('should list all missing vars in error message', async () => {
      process.env = {}

      const { validateEnv } = await import('./env')

      try {
        validateEnv()
        expect.fail('Should have thrown')
      } catch (error) {
        const message = (error as Error).message
        expect(message).toContain('DATABASE_URL')
        expect(message).toContain('STRIPE_SECRET_KEY')
        expect(message).toContain('PAYPAL_CLIENT_ID')
      }
    })

    it('should not throw for missing optional vars', async () => {
      process.env.DATABASE_URL = 'postgres://test'
      process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_xxx'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
      process.env.PAYPAL_CLIENT_ID = 'xxx'
      process.env.PAYPAL_CLIENT_SECRET = 'xxx'
      process.env.PAYPAL_WEBHOOK_ID = 'xxx'
      process.env.PAYPAL_MODE = 'sandbox'
      process.env.CLOUDINARY_CLOUD_NAME = 'xxx'
      process.env.CLOUDINARY_API_KEY = 'xxx'
      process.env.CLOUDINARY_API_SECRET = 'xxx'
      process.env.CHECKOUT_SECRET = 'test-secret'
      process.env.SESSION_SECRET =
        '3d56f86884dcd0b165170c8a8a3a453e7e5ec6328016879c4dd44dcc0ef9017a'
      // Intentionally not setting optional vars like SENDGRID_API_KEY

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).not.toThrow()
    })

    it('should throw when SESSION_SECRET is too short', async () => {
      process.env.DATABASE_URL = 'postgres://test'
      process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_xxx'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
      process.env.PAYPAL_CLIENT_ID = 'xxx'
      process.env.PAYPAL_CLIENT_SECRET = 'xxx'
      process.env.PAYPAL_WEBHOOK_ID = 'xxx'
      process.env.PAYPAL_MODE = 'sandbox'
      process.env.CLOUDINARY_CLOUD_NAME = 'xxx'
      process.env.CLOUDINARY_API_KEY = 'xxx'
      process.env.CLOUDINARY_API_SECRET = 'xxx'
      process.env.CHECKOUT_SECRET = 'test-secret'
      process.env.SESSION_SECRET = 'too-short'

      const { validateEnv } = await import('./env')
      expect(() => validateEnv()).toThrow(
        'SESSION_SECRET must be at least 32 characters long',
      )
    })
  })

  describe('getEnvVar', () => {
    it('should return env var value', async () => {
      process.env.TEST_VAR = 'test-value'

      const { getEnvVar } = await import('./env')
      expect(getEnvVar('TEST_VAR')).toBe('test-value')
    })

    it('should return default value when env var is not set', async () => {
      delete process.env.MISSING_VAR

      const { getEnvVar } = await import('./env')
      expect(getEnvVar('MISSING_VAR', 'default')).toBe('default')
    })

    it('should return undefined when no default provided', async () => {
      delete process.env.MISSING_VAR

      const { getEnvVar } = await import('./env')
      expect(getEnvVar('MISSING_VAR')).toBeUndefined()
    })
  })

  describe('requireEnvVar', () => {
    it('should return env var value', async () => {
      process.env.REQUIRED_VAR = 'required-value'

      const { requireEnvVar } = await import('./env')
      expect(requireEnvVar('REQUIRED_VAR')).toBe('required-value')
    })

    it('should throw when env var is not set', async () => {
      delete process.env.MISSING_REQUIRED_VAR

      const { requireEnvVar } = await import('./env')
      expect(() => requireEnvVar('MISSING_REQUIRED_VAR')).toThrow(
        'Required environment variable MISSING_REQUIRED_VAR is not set',
      )
    })
  })
})
