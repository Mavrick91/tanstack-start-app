import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { checkouts, addresses, customers } from '../../../../db/schema'
import {
  errorResponse,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'

import type { AddressSnapshot } from '../../../../db/schema'

export const Route = createFileRoute(
  '/api/checkout/$checkoutId/shipping-address',
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { checkoutId } = params
          const body = await request.json()
          const {
            firstName,
            lastName,
            company,
            address1,
            address2,
            city,
            province,
            provinceCode,
            country,
            countryCode,
            zip,
            phone,
            saveAddress,
          } = body

          // Validate required fields
          if (!firstName?.trim()) {
            return simpleErrorResponse('First name is required')
          }
          if (!lastName?.trim()) {
            return simpleErrorResponse('Last name is required')
          }
          if (!address1?.trim()) {
            return simpleErrorResponse('Address is required')
          }
          if (!city?.trim()) {
            return simpleErrorResponse('City is required')
          }
          if (!country?.trim() || !countryCode?.trim()) {
            return simpleErrorResponse('Country is required')
          }
          if (!zip?.trim()) {
            return simpleErrorResponse('ZIP/Postal code is required')
          }

          // Get checkout
          const [checkout] = await db
            .select()
            .from(checkouts)
            .where(eq(checkouts.id, checkoutId))
            .limit(1)

          if (!checkout) {
            return simpleErrorResponse('Checkout not found', 404)
          }

          if (checkout.expiresAt < new Date()) {
            return simpleErrorResponse('Checkout has expired', 410)
          }

          if (checkout.completedAt) {
            return simpleErrorResponse(
              'Checkout has already been completed',
              410,
            )
          }

          const shippingAddress: AddressSnapshot = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company?.trim() || undefined,
            address1: address1.trim(),
            address2: address2?.trim() || undefined,
            city: city.trim(),
            province: province?.trim() || undefined,
            provinceCode: provinceCode?.trim() || undefined,
            country: country.trim(),
            countryCode: countryCode.trim(),
            zip: zip.trim(),
            phone: phone?.trim() || undefined,
          }

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

          // Update checkout with shipping address
          const [updatedCheckout] = await db
            .update(checkouts)
            .set({
              shippingAddress,
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
            },
          })
        } catch (error) {
          return errorResponse('Failed to save shipping address', error)
        }
      },
    },
  },
})
