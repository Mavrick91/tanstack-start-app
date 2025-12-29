import { createFileRoute } from '@tanstack/react-router'
import { eq, and } from 'drizzle-orm'

import { db } from '../../../../db'
import { customers, addresses } from '../../../../db/schema'
import {
  errorResponse,
  requireAuth,
  simpleErrorResponse,
  successResponse,
} from '../../../../lib/api'

export const Route = createFileRoute('/api/customers/me/addresses')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          // Get customer profile
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          // Get addresses
          const customerAddresses = await db
            .select()
            .from(addresses)
            .where(eq(addresses.customerId, customer.id))

          return successResponse({
            addresses: customerAddresses.map((addr) => ({
              id: addr.id,
              type: addr.type,
              firstName: addr.firstName,
              lastName: addr.lastName,
              company: addr.company,
              address1: addr.address1,
              address2: addr.address2,
              city: addr.city,
              province: addr.province,
              provinceCode: addr.provinceCode,
              country: addr.country,
              countryCode: addr.countryCode,
              zip: addr.zip,
              phone: addr.phone,
              isDefault: addr.isDefault,
            })),
          })
        } catch (error) {
          return errorResponse('Failed to fetch addresses', error)
        }
      },

      POST: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const body = await request.json()
          const {
            type,
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
            isDefault,
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

          // Get customer profile
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          // If setting as default, unset other default addresses of same type
          if (isDefault) {
            await db
              .update(addresses)
              .set({ isDefault: false })
              .where(
                and(
                  eq(addresses.customerId, customer.id),
                  eq(addresses.type, type || 'shipping'),
                ),
              )
          }

          // Create address
          const [newAddress] = await db
            .insert(addresses)
            .values({
              customerId: customer.id,
              type: type || 'shipping',
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              company: company?.trim() || null,
              address1: address1.trim(),
              address2: address2?.trim() || null,
              city: city.trim(),
              province: province?.trim() || null,
              provinceCode: provinceCode?.trim() || null,
              country: country.trim(),
              countryCode: countryCode.trim(),
              zip: zip.trim(),
              phone: phone?.trim() || null,
              isDefault: isDefault || false,
            })
            .returning()

          return successResponse({ address: newAddress }, 201)
        } catch (error) {
          return errorResponse('Failed to create address', error)
        }
      },

      DELETE: async ({ request }) => {
        try {
          const auth = await requireAuth(request)
          if (!auth.success) return auth.response

          const url = new URL(request.url)
          const addressId = url.searchParams.get('id')

          if (!addressId) {
            return simpleErrorResponse('Address ID is required')
          }

          // Get customer profile
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, auth.user.id))
            .limit(1)

          if (!customer) {
            return simpleErrorResponse('Customer profile not found', 404)
          }

          // Verify address belongs to customer
          const [address] = await db
            .select()
            .from(addresses)
            .where(
              and(
                eq(addresses.id, addressId),
                eq(addresses.customerId, customer.id),
              ),
            )
            .limit(1)

          if (!address) {
            return simpleErrorResponse('Address not found', 404)
          }

          // Delete address
          await db.delete(addresses).where(eq(addresses.id, addressId))

          return successResponse({ deleted: true })
        } catch (error) {
          return errorResponse('Failed to delete address', error)
        }
      },
    },
  },
})
