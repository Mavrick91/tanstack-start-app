import { useForm } from '@tanstack/react-form'
import { useImperativeHandle } from 'react'

import { Button } from './button'
import { Checkbox } from './checkbox'
import { Input } from './input'
import { Label } from './label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { Switch } from './switch'
import { Textarea } from './textarea'

import { cn } from '@/lib/utils'

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'hidden'
  | 'custom'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldDefinition {
  name: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  optional?: boolean
  options?: SelectOption[]
  validate?: (value: unknown) => string | undefined
  validateOnChange?: boolean
  className?: string
  inputClassName?: string
  labelClassName?: string
  prefix?: string
  maxLength?: number
  render?: (props: CustomFieldRenderProps) => React.ReactNode
}

export interface CustomFieldRenderProps {
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  error?: string
  id: string
  disabled?: boolean
  placeholder?: string
}

export interface FormRow {
  columns?: number
  fields: FieldDefinition[]
}

export interface FormDefinition {
  fields?: FieldDefinition[]
  rows?: FormRow[]
}

export interface FNFormRef {
  submit: () => void
  setFieldValue: (name: string, value: unknown) => void
  getFieldValue: (name: string) => unknown
  setFieldError: (name: string, error: string) => void
  getValues: () => Record<string, unknown>
  isSubmitting: boolean
}

export interface FNFormProps {
  formDefinition: FormDefinition
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>
  defaultValues?: Record<string, unknown>
  submitButtonText?: string
  hideSubmitButton?: boolean
  formRef?: React.RefObject<FNFormRef | null>
  onFieldChange?: (
    name: string,
    value: unknown,
    setFieldValue: (name: string, value: unknown) => void,
  ) => void
  className?: string
  renderSubmitButton?: (isSubmitting: boolean) => React.ReactNode
  renderBeforeSubmit?: (values: Record<string, unknown>) => React.ReactNode
}

function getAllFields(formDefinition: FormDefinition): FieldDefinition[] {
  const fields: FieldDefinition[] = []
  if (formDefinition.fields) {
    fields.push(...formDefinition.fields)
  }
  if (formDefinition.rows) {
    formDefinition.rows.forEach((row) => {
      fields.push(...row.fields)
    })
  }
  return fields
}

export function FNForm({
  formDefinition,
  onSubmit,
  defaultValues = {},
  submitButtonText = 'Submit',
  hideSubmitButton = false,
  formRef,
  onFieldChange,
  className,
  renderSubmitButton,
  renderBeforeSubmit,
}: FNFormProps) {
  const allFields = getAllFields(formDefinition)

  const form = useForm({
    defaultValues: allFields.reduce(
      (acc, field) => {
        if (field.type === 'checkbox' || field.type === 'switch') {
          acc[field.name] = defaultValues[field.name] ?? false
        } else {
          acc[field.name] = defaultValues[field.name] ?? ''
        }
        return acc
      },
      {} as Record<string, unknown>,
    ),
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  useImperativeHandle(
    formRef,
    () => ({
      submit: () => form.handleSubmit(),
      setFieldValue: (name: string, value: unknown) =>
        form.setFieldValue(name, value),
      getFieldValue: (name: string) => form.getFieldValue(name),
      setFieldError: (name: string, error: string) =>
        form.setFieldMeta(name, (prev) => ({
          ...prev,
          errorMap: { onChange: error },
        })),
      getValues: () => form.state.values,
      get isSubmitting() {
        return form.state.isSubmitting
      },
    }),
    [form],
  )

  const handleFieldChange = (name: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(name, value, (fieldName, fieldValue) => {
        form.setFieldValue(fieldName, fieldValue)
      })
    }
  }

  const renderField = (field: FieldDefinition) => {
    if (field.type === 'hidden') {
      return (
        <form.Field key={field.name} name={field.name}>
          {() => null}
        </form.Field>
      )
    }

    const validateFn = ({ value }: { value: unknown }) => {
      if (field.required && !value && value !== false) {
        return `${field.label} is required`
      }
      if (field.validate) {
        return field.validate(value)
      }
      return undefined
    }

    return (
      <form.Field
        key={field.name}
        name={field.name}
        validators={{
          onSubmit: validateFn,
          ...(field.validateOnChange ? { onChange: validateFn } : {}),
        }}
      >
        {(fieldApi) => (
          <FormField
            field={field}
            fieldApi={fieldApi}
            onFieldChange={handleFieldChange}
          />
        )}
      </form.Field>
    )
  }

  const renderRows = () => {
    if (formDefinition.rows) {
      return formDefinition.rows.map((row, rowIndex) => {
        if (row.columns && row.columns > 1) {
          return (
            <div
              key={rowIndex}
              className={cn('grid gap-3', {
                'grid-cols-2': row.columns === 2,
                'grid-cols-3': row.columns === 3,
                'grid-cols-4': row.columns === 4,
              })}
            >
              {row.fields.map(renderField)}
            </div>
          )
        }
        return row.fields.map(renderField)
      })
    }

    if (formDefinition.fields) {
      return formDefinition.fields.map(renderField)
    }

    return null
  }

  const renderSubmitButtonContent = () => {
    if (hideSubmitButton) return null

    if (renderSubmitButton) {
      return (
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => renderSubmitButton(isSubmitting)}
        </form.Subscribe>
      )
    }

    return <Button type="submit">{submitButtonText}</Button>
  }

  const renderBeforeSubmitContent = () => {
    if (!renderBeforeSubmit) return null

    return (
      <form.Subscribe selector={(state) => state.values}>
        {(values) => renderBeforeSubmit(values as Record<string, unknown>)}
      </form.Subscribe>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className={cn('space-y-4', className)}
    >
      {renderRows()}
      {renderBeforeSubmitContent()}
      {renderSubmitButtonContent()}
    </form>
  )
}

interface FormFieldApi {
  state: {
    value: unknown
    meta: {
      errors: (string | undefined)[]
    }
  }
  handleChange: (value: unknown) => void
  handleBlur: () => void
}

interface FormFieldProps {
  field: FieldDefinition
  fieldApi: FormFieldApi
  onFieldChange: (name: string, value: unknown) => void
}

function FormField({ field, fieldApi, onFieldChange }: FormFieldProps) {
  const { state, handleChange: apiHandleChange, handleBlur } = fieldApi
  const errors = state.meta.errors.filter(Boolean) as string[]
  const hasError = errors.length > 0
  const inputId = `fn-form-${field.name}`

  const handleChange = (value: unknown) => {
    apiHandleChange(value)
    onFieldChange(field.name, value)
  }

  const renderInput = () => {
    if (field.type === 'custom' && field.render) {
      return field.render({
        value: state.value,
        onChange: handleChange,
        onBlur: handleBlur,
        error: errors[0],
        id: inputId,
        disabled: field.disabled,
        placeholder: field.placeholder,
      })
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        if (field.prefix) {
          return (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {field.prefix}
              </span>
              <Input
                id={inputId}
                type={field.type}
                value={String(state.value ?? '')}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={field.placeholder}
                disabled={field.disabled}
                aria-invalid={hasError}
                className={cn('pl-6', field.inputClassName)}
              />
            </div>
          )
        }
        return (
          <Input
            id={inputId}
            type={field.type}
            value={String(state.value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            disabled={field.disabled}
            aria-invalid={hasError}
            className={field.inputClassName}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={inputId}
            value={String(state.value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            disabled={field.disabled}
            aria-invalid={hasError}
            className={field.inputClassName}
          />
        )

      case 'select':
        return (
          <Select
            value={String(state.value ?? '')}
            onValueChange={handleChange}
            disabled={field.disabled}
          >
            <SelectTrigger
              id={inputId}
              aria-invalid={hasError}
              className={field.inputClassName}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={Boolean(state.value)}
              onCheckedChange={handleChange}
              disabled={field.disabled}
              aria-invalid={hasError}
            />
            <Label htmlFor={inputId}>{field.label}</Label>
          </div>
        )

      case 'switch':
        return (
          <div className="flex items-center gap-2">
            <Switch
              id={inputId}
              checked={Boolean(state.value)}
              onCheckedChange={handleChange}
              disabled={field.disabled}
              aria-invalid={hasError}
            />
            <Label htmlFor={inputId}>{field.label}</Label>
          </div>
        )

      default:
        return null
    }
  }

  const showLabelAbove = !['checkbox', 'switch', 'hidden'].includes(field.type)
  const charCount = String(state.value || '').length

  return (
    <div className={cn('space-y-2', field.className)}>
      {showLabelAbove && (
        <div className="flex items-center justify-between">
          <Label htmlFor={inputId} className={field.labelClassName}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            {field.optional && (
              <span className="text-gray-400 ml-1">(optional)</span>
            )}
          </Label>
          {field.maxLength && (
            <span className="text-xs text-muted-foreground">
              {charCount} / {field.maxLength} characters
            </span>
          )}
        </div>
      )}
      {renderInput()}
      {hasError && <p className="text-sm text-red-500">{errors[0]}</p>}
    </div>
  )
}
