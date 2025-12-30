const requiredEnvVars = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_MODE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CHECKOUT_SECRET',
] as const

const optionalEnvVars = [
  'SENDGRID_API_KEY',
  'TAX_RATE',
  'FROM_EMAIL',
  'FROM_NAME',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
] as const

/**
 * Validate that all required environment variables are set
 * Call this on application startup
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`,
    )
  }

  // Warn about optional vars in development
  if (process.env.NODE_ENV !== 'production') {
    for (const envVar of optionalEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`Optional env var ${envVar} not set`)
      }
    }
  }
}

/**
 * Get an environment variable with an optional default
 */
export function getEnvVar(
  name: string,
  defaultValue?: string,
): string | undefined {
  return process.env[name] ?? defaultValue
}

/**
 * Get a required environment variable, throwing if not set
 */
export function requireEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}
