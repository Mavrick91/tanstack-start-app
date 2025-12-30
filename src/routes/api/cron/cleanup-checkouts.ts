import { createFileRoute } from '@tanstack/react-router'

import { withSecurityHeaders } from '../../../lib/api'
import {
  cleanupAbandonedCheckouts,
  getAbandonedCheckoutCount,
} from '../../../lib/checkout-cleanup'

// Secret key for cron job authentication
// Should be set in environment variables and passed in headers
const CRON_SECRET = process.env.CRON_SECRET

export const Route = createFileRoute('/api/cron/cleanup-checkouts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify cron secret if configured
        if (CRON_SECRET) {
          const authHeader = request.headers.get('authorization')
          const providedSecret = authHeader?.replace('Bearer ', '')

          if (providedSecret !== CRON_SECRET) {
            return withSecurityHeaders(
              new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }),
            )
          }
        }

        try {
          // Get count before cleanup for reporting
          const abandonedCount = await getAbandonedCheckoutCount()

          // Run cleanup
          const result = await cleanupAbandonedCheckouts()

          if (result.error) {
            return withSecurityHeaders(
              new Response(
                JSON.stringify({
                  success: false,
                  error: result.error,
                }),
                {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
                },
              ),
            )
          }

          return withSecurityHeaders(
            new Response(
              JSON.stringify({
                success: true,
                abandonedBefore: abandonedCount,
                deleted: result.deletedCount,
                timestamp: new Date().toISOString(),
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        } catch (error) {
          console.error('Cron cleanup error:', error)
          return withSecurityHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }
      },

      // GET endpoint for checking status (read-only)
      GET: async ({ request }) => {
        // Verify cron secret if configured
        if (CRON_SECRET) {
          const authHeader = request.headers.get('authorization')
          const providedSecret = authHeader?.replace('Bearer ', '')

          if (providedSecret !== CRON_SECRET) {
            return withSecurityHeaders(
              new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }),
            )
          }
        }

        try {
          const abandonedCount = await getAbandonedCheckoutCount()

          return withSecurityHeaders(
            new Response(
              JSON.stringify({
                success: true,
                abandonedCheckouts: abandonedCount,
                timestamp: new Date().toISOString(),
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        } catch (error) {
          console.error('Cron status error:', error)
          return withSecurityHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }
      },
    },
  },
})
