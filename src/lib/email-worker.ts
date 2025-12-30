import { Worker, type Job } from 'bullmq'

import { sendOrderConfirmationEmail, sendShippingUpdateEmail } from './email'
import { getRedisConnection, type EmailJob } from './queue'

// Email worker processor
async function processEmailJob(job: Job<EmailJob>): Promise<void> {
  const { type, data } = job.data

  console.log(`[EmailWorker] Processing job: ${type} for ${data.email}`)

  let result

  switch (type) {
    case 'order_confirmation':
      result = await sendOrderConfirmationEmail(data)
      break
    case 'shipping_update':
      result = await sendShippingUpdateEmail(data)
      break
    default:
      throw new Error(`Unknown email job type: ${type}`)
  }

  if (!result.success) {
    throw new Error(result.error || 'Email send failed')
  }

  console.log(`[EmailWorker] Email sent successfully: ${type} to ${data.email}`)
}

// Create and start worker
export function startEmailWorker(): Worker {
  const worker = new Worker('email', processEmailJob, {
    connection: getRedisConnection(),
    concurrency: 5, // Process up to 5 emails concurrently
  })

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message)

    // Check if max retries exhausted
    if (job && job.attemptsMade >= (job.opts?.attempts || 5)) {
      console.error(
        `[EmailWorker] Job ${job.id} exhausted all retries. Email to ${
          (job.data as EmailJob).data.email
        } not delivered.`,
      )
      // Here you could add alerting (e.g., send to Sentry, PagerDuty, etc.)
    }
  })

  worker.on('error', (err) => {
    console.error('[EmailWorker] Worker error:', err)
  })

  console.log('[EmailWorker] Worker started')

  return worker
}
