import { RateLimiterMemory } from 'rate-limiter-flexible'

const authLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 15,
})

const apiLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
})

const webhookLimiter = new RateLimiterMemory({
  points: 50,
  duration: 60,
})

type LimiterType = 'auth' | 'api' | 'webhook'

const limiters = {
  auth: authLimiter,
  api: apiLimiter,
  webhook: webhookLimiter,
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

export async function checkRateLimit(
  limiter: LimiterType,
  key: string,
): Promise<RateLimitResult> {
  const rateLimiter = limiters[limiter]

  try {
    await rateLimiter.consume(key)
    return { allowed: true }
  } catch (error) {
    const rateLimitError = error as { msBeforeNext?: number }
    const retryAfter = Math.ceil((rateLimitError.msBeforeNext || 0) / 1000)
    return { allowed: false, retryAfter }
  }
}

export function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function resetRateLimiter(limiter: LimiterType): Promise<void> {
  const rateLimiter = limiters[limiter]
  await rateLimiter.delete('*')
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  })
}
