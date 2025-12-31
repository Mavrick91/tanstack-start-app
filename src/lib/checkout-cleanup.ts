import { lt, and, isNull } from 'drizzle-orm'

import { db } from '../db'
import { checkouts } from '../db/schema'

// Default: clean up checkouts older than 24 hours that haven't been completed
const DEFAULT_EXPIRY_HOURS = 24

export interface CleanupResult {
  deletedCount: number
  error?: string
}

/**
 * Clean up abandoned checkouts that are older than the specified hours
 * and haven't been completed.
 */
export const cleanupAbandonedCheckouts = async (
  expiryHours: number = DEFAULT_EXPIRY_HOURS,
): Promise<CleanupResult> => {
  try {
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() - expiryHours)

    const result = await db
      .delete(checkouts)
      .where(
        and(lt(checkouts.createdAt, expiryDate), isNull(checkouts.completedAt)),
      )
      .returning({ id: checkouts.id })

    return { deletedCount: result.length }
  } catch (error) {
    console.error('Checkout cleanup failed:', error)
    return {
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get count of abandoned checkouts (for monitoring)
 */
export const getAbandonedCheckoutCount = async (
  expiryHours: number = DEFAULT_EXPIRY_HOURS,
): Promise<number> => {
  const expiryDate = new Date()
  expiryDate.setHours(expiryDate.getHours() - expiryHours)

  const result = await db
    .select({ id: checkouts.id })
    .from(checkouts)
    .where(
      and(lt(checkouts.createdAt, expiryDate), isNull(checkouts.completedAt)),
    )

  return result.length
}
