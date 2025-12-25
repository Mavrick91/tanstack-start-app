import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Textarea } from '../../ui/textarea'

type LocalizedString = { en: string; fr?: string; id?: string }

type ProductFormData = {
  name: LocalizedString
  description: LocalizedString
  handle: string
  vendor: string
  productType: string
  status: 'draft' | 'active' | 'archived'
}

type NewProductFormProps = {
  onBack: () => void
}

/**
 * New Product Form using TanStack Form + Shadcn UI
 */
export function NewProductForm({ onBack }: NewProductFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onBack()
    },
  })

  const form = useForm({
    defaultValues: {
      name: { en: '', fr: '', id: '' } as LocalizedString,
      description: { en: '', fr: '', id: '' } as LocalizedString,
      handle: '',
      vendor: '',
      productType: '',
      status: 'draft' as 'draft' | 'active' | 'archived',
    },
    onSubmit: async ({ value }) => {
      createProduct.mutate(value)
    },
  })

  const generateHandle = () => {
    const currentHandle = form.getFieldValue('handle')
    if (currentHandle) return

    const name = form.getFieldValue('name')
    const handle = name.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    form.setFieldValue('handle', handle)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('Back to Products')}
        </Button>
        <h1 className="text-2xl font-bold">{t('Add Product')}</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-6"
      >
        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Product Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name with locale tabs */}
            <div className="space-y-2">
              <Label>{t('Name')}</Label>
              <form.Field name="name">
                {(field) => (
                  <Tabs defaultValue="en" className="w-full">
                    <TabsList className="mb-2">
                      <TabsTrigger value="en">EN</TabsTrigger>
                      <TabsTrigger value="fr">FR</TabsTrigger>
                      <TabsTrigger value="id">ID</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en">
                      <Input
                        value={field.state.value.en || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            en: e.target.value,
                          })
                        }
                        onBlur={generateHandle}
                        placeholder={t('Product name in English')}
                      />
                    </TabsContent>
                    <TabsContent value="fr">
                      <Input
                        value={field.state.value.fr || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            fr: e.target.value,
                          })
                        }
                        placeholder={t('Product name in French')}
                      />
                    </TabsContent>
                    <TabsContent value="id">
                      <Input
                        value={field.state.value.id || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            id: e.target.value,
                          })
                        }
                        placeholder={t('Product name in Indonesian')}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </form.Field>
            </div>

            {/* Handle */}
            <div className="space-y-2">
              <Label htmlFor="handle">{t('Handle (URL slug)')}</Label>
              <form.Field name="handle">
                {(field) => (
                  <Input
                    id="handle"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t('product-url-slug')}
                  />
                )}
              </form.Field>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <form.Field name="description">
                {(field) => (
                  <Tabs defaultValue="en" className="w-full">
                    <TabsList className="mb-2">
                      <TabsTrigger value="en">EN</TabsTrigger>
                      <TabsTrigger value="fr">FR</TabsTrigger>
                      <TabsTrigger value="id">ID</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en">
                      <Textarea
                        value={field.state.value.en || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            en: e.target.value,
                          })
                        }
                        placeholder={t('Product description in English')}
                        rows={4}
                      />
                    </TabsContent>
                    <TabsContent value="fr">
                      <Textarea
                        value={field.state.value.fr || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            fr: e.target.value,
                          })
                        }
                        placeholder={t('Product description in French')}
                        rows={4}
                      />
                    </TabsContent>
                    <TabsContent value="id">
                      <Textarea
                        value={field.state.value.id || ''}
                        onChange={(e) =>
                          field.handleChange({
                            ...field.state.value,
                            id: e.target.value,
                          })
                        }
                        placeholder={t('Product description in Indonesian')}
                        rows={4}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </form.Field>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Organization')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">{t('Vendor')}</Label>
                <form.Field name="vendor">
                  {(field) => (
                    <Input
                      id="vendor"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t('Brand name')}
                    />
                  )}
                </form.Field>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productType">{t('Product Type')}</Label>
                <form.Field name="productType">
                  {(field) => (
                    <Input
                      id="productType"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t('e.g., Nail Polish')}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form.Field name="status">
              {(field) => (
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as 'draft' | 'active' | 'archived')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('Select status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('Draft')}</SelectItem>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="archived">{t('Archived')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            {t('Cancel')}
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                disabled={isSubmitting || createProduct.isPending}
              >
                {createProduct.isPending
                  ? t('Creating...')
                  : t('Create Product')}
              </Button>
            )}
          </form.Subscribe>
        </div>

        {createProduct.isError && (
          <p className="text-red-500 text-sm">
            {t('Error')}: {createProduct.error.message}
          </p>
        )}
      </form>
    </div>
  )
}
