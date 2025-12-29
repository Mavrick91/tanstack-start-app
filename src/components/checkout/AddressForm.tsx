import { useForm } from '@tanstack/react-form'
import { useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import { IMaskInput } from 'react-imask'

import { AddressAutocomplete } from './AddressAutocomplete'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

import type { AddressFormData } from '../../lib/checkout-schemas'

type AddressFormProps = {
  defaultValues?: Partial<AddressFormData>
  onSubmit: (data: AddressFormData) => void | Promise<void>
  formRef?: React.RefObject<{ submit: () => void } | null>
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
]

export function AddressForm({
  defaultValues,
  onSubmit,
  formRef,
}: AddressFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      company: defaultValues?.company || '',
      address1: defaultValues?.address1 || '',
      address2: defaultValues?.address2 || '',
      city: defaultValues?.city || '',
      province: defaultValues?.province || '',
      provinceCode: defaultValues?.provinceCode || '',
      country: defaultValues?.country || '',
      countryCode: defaultValues?.countryCode || '',
      zip: defaultValues?.zip || '',
      phone: defaultValues?.phone || '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const errors: Record<string, string> = {}
        if (!value.firstName) errors.firstName = 'First name is required'
        if (!value.lastName) errors.lastName = 'Last name is required'
        if (!value.address1) errors.address1 = 'Address is required'
        if (!value.city) errors.city = 'City is required'
        if (!value.countryCode) errors.countryCode = 'Country is required'
        if (!value.zip) errors.zip = 'ZIP code is required'

        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as AddressFormData)
    },
  })

  // Expose submit method via ref
  useImperativeHandle(
    formRef,
    () => ({
      submit: () => form.handleSubmit(),
    }),
    [form],
  )

  const handleAddressSelect = (address: Partial<AddressFormData>) => {
    if (address.address1) form.setFieldValue('address1', address.address1)
    if (address.city) form.setFieldValue('city', address.city)
    if (address.province) form.setFieldValue('province', address.province)
    if (address.provinceCode)
      form.setFieldValue('provinceCode', address.provinceCode)
    if (address.country) form.setFieldValue('country', address.country)
    if (address.countryCode)
      form.setFieldValue('countryCode', address.countryCode)
    if (address.zip) form.setFieldValue('zip', address.zip)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {/* Country - First for better UX */}
      <form.Field name="countryCode">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="country">
              {t('Country')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => {
                field.handleChange(value)
                const country = COUNTRIES.find((c) => c.code === value)
                if (country) {
                  form.setFieldValue('country', country.name)
                }
              }}
            >
              <SelectTrigger id="country" className="h-11">
                <SelectValue placeholder={t('Select country')} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-500">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="firstName">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="firstName">
                {t('First name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="lastName">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="lastName">
                {t('Last name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      {/* Company */}
      <form.Field name="company">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="company">
              {t('Company')}{' '}
              <span className="text-gray-400">({t('optional')})</span>
            </Label>
            <Input
              id="company"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="h-11"
            />
          </div>
        )}
      </form.Field>

      {/* Address with autocomplete */}
      <form.Field name="address1">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="address1">
              {t('Address')} <span className="text-red-500">*</span>
            </Label>
            <AddressAutocomplete
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onAddressSelect={handleAddressSelect}
              placeholder={t('Street address')}
              className="h-11"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-500">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Apartment */}
      <form.Field name="address2">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="address2">
              {t('Apartment, suite, etc.')}{' '}
              <span className="text-gray-400">({t('optional')})</span>
            </Label>
            <Input
              id="address2"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="h-11"
            />
          </div>
        )}
      </form.Field>

      {/* City, State, ZIP */}
      <div className="grid grid-cols-3 gap-3">
        <form.Field name="city">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="city">
                {t('City')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="province">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="province">{t('State')}</Label>
              <Input
                id="province"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="zip">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="zip">
                {t('ZIP code')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zip"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-11"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      {/* Phone with mask */}
      <form.Field name="phone">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              {t('Phone')}{' '}
              <span className="text-gray-400">({t('optional')})</span>
            </Label>
            <IMaskInput
              id="phone"
              mask="+{1} (000) 000-0000"
              value={field.state.value}
              onAccept={(value) => field.handleChange(value)}
              placeholder="+1 (555) 123-4567"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}
      </form.Field>
    </form>
  )
}
