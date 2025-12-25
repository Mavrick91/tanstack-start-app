import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs'
import { Textarea } from '../../../components/ui/textarea'

type LocalizedString = { en: string; fr?: string; id?: string }

type Product = {
  id: string
  handle: string
  name: LocalizedString
  description: LocalizedString | null
  metaTitle: LocalizedString | null
  metaDescription: LocalizedString | null
  vendor: string | null
  productType: string | null
  status: 'draft' | 'active' | 'archived'
  tags: string[] | null
  publishedAt: string | null
}

export const Route = createFileRoute('/admin/products/$productId')({
  component: EditProductPage,
})

function EditProductPage() {
  const { t } = useTranslation()
  const { productId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.product as Product
    },
  })

  const updateProduct = useMutation({
    mutationFn: async (updateData: {
      name: LocalizedString
      description: LocalizedString
      handle: string
      vendor: string
      productType: string
      status: 'draft' | 'active' | 'archived'
    }) => {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
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
      updateProduct.mutate(value)
    },
  })

  // Reset form when data loads
  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name || { en: '', fr: '', id: '' },
        description: data.description || { en: '', fr: '', id: '' },
        handle: data.handle || '',
        vendor: data.vendor || '',
        productType: data.productType || '',
        status: data.status,
      })
    }
  }, [data, form])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{t('Failed to load product')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.navigate({ to: '/admin/products' })}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('Back to Products')}
        </Button>
        <h1 className="text-2xl font-bold">{t('Edit Product')}</h1>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => router.navigate({ to: '/admin/products' })}
          >
            {t('Cancel')}
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                disabled={isSubmitting || updateProduct.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateProduct.isPending ? t('Saving...') : t('Save Changes')}
              </Button>
            )}
          </form.Subscribe>
        </div>

        {updateProduct.isSuccess && (
          <p className="text-green-500 text-sm">
            {t('Product saved successfully!')}
          </p>
        )}

        {updateProduct.isError && (
          <p className="text-red-500 text-sm">
            {t('Error')}: {updateProduct.error.message}
          </p>
        )}
      </form>
    </div>
  )
}
