import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IMaskInput } from 'react-imask'

import { AddressAutocomplete } from './AddressAutocomplete'
import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
  type CustomFieldRenderProps,
} from '../ui/fn-form'

import type { AddressFormData } from '../../lib/checkout-schemas'

type AddressFormProps = {
  defaultValues?: Partial<AddressFormData>
  onSubmit: (data: AddressFormData) => void | Promise<void>
  formRef?: React.MutableRefObject<{ submit: () => void } | null>
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
]

const COUNTRY_MAP = COUNTRIES.reduce(
  (acc, country) => {
    acc[country.value] = country.label
    return acc
  },
  {} as Record<string, string>,
)

export const AddressForm = ({
  defaultValues,
  onSubmit,
  formRef,
}: AddressFormProps) => {
  const { t } = useTranslation()
  const internalFormRef = useRef<FNFormRef | null>(null)

  // Expose submit method via formRef for backwards compatibility
  useEffect(() => {
    if (formRef) {
      formRef.current = {
        submit: () => internalFormRef.current?.submit(),
      }
    }
  }, [formRef])

  const handleAddressSelect = (address: Partial<AddressFormData>) => {
    const ref = internalFormRef.current
    if (!ref) return

    if (address.address1) ref.setFieldValue('address1', address.address1)
    if (address.city) ref.setFieldValue('city', address.city)
    if (address.province) ref.setFieldValue('province', address.province)
    if (address.provinceCode)
      ref.setFieldValue('provinceCode', address.provinceCode)
    if (address.country) ref.setFieldValue('country', address.country)
    if (address.countryCode)
      ref.setFieldValue('countryCode', address.countryCode)
    if (address.zip) ref.setFieldValue('zip', address.zip)
  }

  const formDefinition: FormDefinition = {
    rows: [
      // Country
      {
        fields: [
          {
            name: 'countryCode',
            type: 'select',
            label: t('Country'),
            placeholder: t('Select country'),
            required: true,
            options: COUNTRIES,
            inputClassName: 'h-11',
          },
        ],
      },
      // Name row (2 columns)
      {
        columns: 2,
        fields: [
          {
            name: 'firstName',
            type: 'text',
            label: t('First name'),
            required: true,
            inputClassName: 'h-11',
          },
          {
            name: 'lastName',
            type: 'text',
            label: t('Last name'),
            required: true,
            inputClassName: 'h-11',
          },
        ],
      },
      // Company
      {
        fields: [
          {
            name: 'company',
            type: 'text',
            label: t('Company'),
            optional: true,
            inputClassName: 'h-11',
          },
        ],
      },
      // Address with autocomplete
      {
        fields: [
          {
            name: 'address1',
            type: 'custom',
            label: t('Address'),
            required: true,
            render: (props: CustomFieldRenderProps) => (
              <AddressAutocomplete
                value={String(props.value ?? '')}
                onChange={(value) => props.onChange(value)}
                onAddressSelect={handleAddressSelect}
                placeholder={t('Street address')}
                className="h-11"
              />
            ),
          },
        ],
      },
      // Apartment
      {
        fields: [
          {
            name: 'address2',
            type: 'text',
            label: t('Apartment, suite, etc.'),
            optional: true,
            inputClassName: 'h-11',
          },
        ],
      },
      // City, State, ZIP (3 columns)
      {
        columns: 3,
        fields: [
          {
            name: 'city',
            type: 'text',
            label: t('City'),
            required: true,
            inputClassName: 'h-11',
          },
          {
            name: 'province',
            type: 'text',
            label: t('State'),
            inputClassName: 'h-11',
          },
          {
            name: 'zip',
            type: 'text',
            label: t('ZIP code'),
            required: true,
            inputClassName: 'h-11',
          },
        ],
      },
      // Phone with mask
      {
        fields: [
          {
            name: 'phone',
            type: 'custom',
            label: t('Phone'),
            optional: true,
            render: (props: CustomFieldRenderProps) => (
              <IMaskInput
                id={props.id}
                mask="+{1} (000) 000-0000"
                value={String(props.value ?? '')}
                onAccept={(value) => props.onChange(value)}
                placeholder="+1 (555) 123-4567"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            ),
          },
        ],
      },
      // Hidden fields
      {
        fields: [
          { name: 'country', type: 'hidden', label: 'Country Name' },
          { name: 'provinceCode', type: 'hidden', label: 'Province Code' },
        ],
      },
    ],
  }

  const handleFieldChange = (
    name: string,
    value: unknown,
    setFieldValue: (name: string, value: unknown) => void,
  ) => {
    if (name === 'countryCode') {
      const countryName = COUNTRY_MAP[value as string] || ''
      setFieldValue('country', countryName)
    }
  }

  return (
    <FNForm
      formDefinition={formDefinition}
      onSubmit={(values) => onSubmit(values as AddressFormData)}
      defaultValues={defaultValues}
      formRef={internalFormRef}
      hideSubmitButton
      onFieldChange={handleFieldChange}
    />
  )
}
