import { gt, sql } from 'drizzle-orm'

import { db } from '../db'
import { rateLimits } from '../db/schema'

type LimiterType = 'auth' | 'api' | 'webhook'

interface LimiterConfig {
  points: number
  duration: number // seconds
}

const limiterConfigs: Record<LimiterType, LimiterConfig> = {
  auth: { points: 5, duration: 60 * 15 }, // 5 attempts per 15 minutes
  api: { points: 100, duration: 60 }, // 100 requests per minute
  webhook: { points: 50, duration: 60 }, // 50 webhook requests per minute
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

export async function checkRateLimit(
  limiter: LimiterType,
  key: string,
): Promise<RateLimitResult> {
  const config = limiterConfigs[limiter]
  const compositeKey = `${limiter}:${key}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.duration * 1000)

  try {
    // Use upsert to atomically increment or create the rate limit record
    const result = await db
      .insert(rateLimits)
      .values({
        key: compositeKey,
        points: 1,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          // If expired, reset to 1; otherwise increment
          points: sql`CASE
            WHEN ${rateLimits.expiresAt} < NOW() THEN 1
            ELSE ${rateLimits.points} + 1
          END`,
          // If expired, set new expiry; otherwise keep existing
          expiresAt: sql`CASE
            WHEN ${rateLimits.expiresAt} < NOW() THEN ${expiresAt}
            ELSE ${rateLimits.expiresAt}
          END`,
        },
      })
      .returning({
        points: rateLimits.points,
        expiresAt: rateLimits.expiresAt,
      })

    const record = result[0]

    if (record.points > config.points) {
      const retryAfter = Math.ceil(
        (record.expiresAt.getTime() - now.getTime()) / 1000,
      )
      return { allowed: false, retryAfter: Math.max(1, retryAfter) }
    }

    return { allowed: true }
  } catch (error) {
    // On database error, fail open (allow request) to prevent blocking
    console.error('Rate limit check failed:', error)
    return { allowed: true }
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
  const prefix = `${limiter}:`
  await db.delete(rateLimits).where(sql`${rateLimits.key} LIKE ${prefix + '%'}`)
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await db
    .delete(rateLimits)
    .where(gt(sql`NOW()`, rateLimits.expiresAt))
    .returning({ key: rateLimits.key })

  return result.length
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  })
}
