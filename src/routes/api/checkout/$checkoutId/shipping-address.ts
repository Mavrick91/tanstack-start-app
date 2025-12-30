import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts, addresses, customers } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'
import { validateCheckoutAccess } from '../../../../lib/checkout-auth'
import { calculateTax, formatTaxAmount } from '../../../../lib/tax'
import {
  validateAddressFields,
  normalizeAddress,
} from '../../../../lib/validation'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/shipping-address',
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.clone().json()
          const { saveAddress } = body

          // Validate required fields
          const validationResult = validateAddressFields(body)
          if (!validationResult.valid) {
            return simpleErrorResponse(validationResult.error)
          }

          const access = await validateCheckoutAccess(checkoutId, request)
          if (!access.valid) {
            const status =
              access.error === 'Checkout not found'
                ? 404
                : access.error === 'Unauthorized'
                  ? 403
                  : 410
            return new Response(JSON.stringify({ error: access.error }), {
              status,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const checkout = access.checkout!

          const shippingAddress = normalizeAddress(body)

          // Check if customer has a linked user account
          let hasUserAccount = false
          if (checkout.customerId) {
            const [customer] = await db
              .select()
              .from(customers)
              .where(eq(customers.id, checkout.customerId))
              .limit(1)
            hasUserAccount = !!customer?.userId
          }

          // Recalculate tax based on new shipping address
          // Tax calculation could vary by region in a more complex implementation
          const subtotal = parseFloat(checkout.subtotal)
          const shippingTotal = parseFloat(checkout.shippingTotal || '0')
          const newTaxTotal = calculateTax(subtotal + shippingTotal)
          const newTotal = subtotal + shippingTotal + newTaxTotal

          // Update checkout with shipping address and recalculated tax
          const [updatedCheckout] = await db
            .update(checkouts)
            .set({
              shippingAddress,
              taxTotal: formatTaxAmount(newTaxTotal),
              total: newTotal.toFixed(2),
              // If guest wants to save address, store it as pending for when they create an account
              pendingSaveAddress: saveAddress && !hasUserAccount,
              updatedAt: new Date(),
            })
            .where(eq(checkouts.id, checkoutId))
            .returning()

          // Save address to customer profile if user is logged in
          if (saveAddress && checkout.customerId && hasUserAccount) {
            await db.insert(addresses).values({
              customerId: checkout.customerId,
              type: 'shipping',
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              company: shippingAddress.company || null,
              address1: shippingAddress.address1,
              address2: shippingAddress.address2 || null,
              city: shippingAddress.city,
              province: shippingAddress.province || null,
              provinceCode: shippingAddress.provinceCode || null,
              country: shippingAddress.country,
              countryCode: shippingAddress.countryCode,
              zip: shippingAddress.zip,
              phone: shippingAddress.phone || null,
              isDefault: false,
            })
          }

          return successResponse({
            checkout: {
              id: updatedCheckout.id,
              shippingAddress: updatedCheckout.shippingAddress,
              taxTotal: parseFloat(updatedCheckout.taxTotal || '0'),
              total: parseFloat(updatedCheckout.total),
            },
          })
        } catch (error) {
          return errorResponse('Failed to save shipping address', error)
        }
      },
    },
  },
})
