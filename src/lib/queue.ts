import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
}

// Singleton Redis connection
let redis: Redis | null = null

export function getRedisConnection(): Redis {
  if (!redis) {
    redis = new Redis(redisConfig)
  }
  return redis
}

// Check if Redis is configured and available
export async function isQueueAvailable(): Promise<boolean> {
  if (!process.env.REDIS_HOST) {
    return false
  }

  try {
    const connection = getRedisConnection()
    await connection.ping()
    return true
  } catch {
    return false
  }
}

// Email queue with exponential backoff
let emailQueue: Queue | null = null

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue('email', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1s, then 2s, 4s, 8s, 16s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 1000, // Keep last 1000 failed jobs for debugging
      },
    })
  }
  return emailQueue
}

// Job types
export interface OrderConfirmationEmailJob {
  type: 'order_confirmation'
  data: {
    id: string
    orderNumber: number
    email: string
    total: number
    currency: string
    items: Array<{
      title: string
      variantTitle?: string | null
      quantity: number
      price: number
    }>
    shippingAddress: {
      firstName: string
      lastName: string
      company?: string
      address1: string
      address2?: string
      city: string
      province?: string
      provinceCode?: string
      country: string
      countryCode: string
      zip: string
      phone?: string
    }
  }
}

export interface ShippingUpdateEmailJob {
  type: 'shipping_update'
  data: {
    email: string
    orderNumber: number
    trackingNumber?: string
    carrier?: string
    estimatedDelivery?: string
  }
}

export type EmailJob = OrderConfirmationEmailJob | ShippingUpdateEmailJob

// Add email job to queue
export async function queueEmail(job: EmailJob): Promise<string> {
  const queue = getEmailQueue()
  const queueJob = await queue.add(job.type, job, {
    jobId: `${job.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  })
  return queueJob.id || ''
}

// Graceful shutdown
export async function closeQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close()
    emailQueue = null
  }
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
