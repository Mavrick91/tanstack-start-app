import { z } from 'zod'

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')

export const addressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  countryCode: z.string().min(1, 'Country is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  phone: z.string().optional(),
})

export const informationFormSchema = z.object({
  email: emailSchema,
  address: addressSchema,
  saveAddress: z.boolean().default(false),
})

export const shippingFormSchema = z.object({
  shippingRateId: z.string().min(1, 'Please select a shipping method'),
})

export type InformationFormData = z.infer<typeof informationFormSchema>
export type ShippingFormData = z.infer<typeof shippingFormSchema>
export type AddressFormData = z.infer<typeof addressSchema>
