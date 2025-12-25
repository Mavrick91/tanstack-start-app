import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500/20 border-t-pink-500" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Product...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 bg-card rounded-3xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-2">
          {t('Failed to load product')}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('Check your connection or catalog access.')}
        </p>
      </div>
    )
  }

  const generateHandle = () => {
    const name = form.getFieldValue('name')
    const handle = name.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    form.setFieldValue('handle', handle)
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.navigate({ to: '/admin/products' })}
            className="gap-2 mb-2 hover:bg-pink-500/5 hover:text-pink-600 rounded-lg transition-all font-medium text-xs text-muted-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('Back to Products')}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {t('Edit Product')}
          </h1>
          <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest mt-1">
            ID: <span className="text-foreground">{productId}</span>
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Product Details')}
            </h2>

            <div className="space-y-6">
              {/* Name Locale Tabs */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">{t('Name')}</Label>
                <form.Field name="name">
                  {(field) => (
                    <Tabs defaultValue="en" className="w-full">
                      <TabsList className="bg-muted/30 p-1 rounded-xl mb-3 flex-wrap h-auto">
                        <TabsTrigger
                          value="en"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          EN
                        </TabsTrigger>
                        <TabsTrigger
                          value="fr"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          FR
                        </TabsTrigger>
                        <TabsTrigger
                          value="id"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          ID
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="en" className="mt-0">
                        <Input
                          className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
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
                      <TabsContent value="fr" className="mt-0">
                        <Input
                          className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
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
                      <TabsContent value="id" className="mt-0">
                        <Input
                          className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
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

              {/* Description Tabs */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {t('Description')}
                </Label>
                <form.Field name="description">
                  {(field) => (
                    <Tabs defaultValue="en" className="w-full">
                      <TabsList className="bg-muted/30 p-1 rounded-xl mb-3 flex-wrap h-auto">
                        <TabsTrigger
                          value="en"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          EN
                        </TabsTrigger>
                        <TabsTrigger
                          value="fr"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          FR
                        </TabsTrigger>
                        <TabsTrigger
                          value="id"
                          className="rounded-lg px-4 py-1 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                        >
                          ID
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="en" className="mt-0">
                        <Textarea
                          className="bg-background/50 border-border rounded-xl font-medium p-4 focus:ring-pink-500/20 shadow-sm resize-none min-h-[120px]"
                          value={field.state.value.en || ''}
                          onChange={(e) =>
                            field.handleChange({
                              ...field.state.value,
                              en: e.target.value,
                            })
                          }
                          placeholder={t('Product description in English')}
                        />
                      </TabsContent>
                      <TabsContent value="fr" className="mt-0">
                        <Textarea
                          className="bg-background/50 border-border rounded-xl font-medium p-4 focus:ring-pink-500/20 shadow-sm resize-none min-h-[120px]"
                          value={field.state.value.fr || ''}
                          onChange={(e) =>
                            field.handleChange({
                              ...field.state.value,
                              fr: e.target.value,
                            })
                          }
                          placeholder={t('Product description in French')}
                        />
                      </TabsContent>
                      <TabsContent value="id" className="mt-0">
                        <Textarea
                          className="bg-background/50 border-border rounded-xl font-medium p-4 focus:ring-pink-500/20 shadow-sm resize-none min-h-[120px]"
                          value={field.state.value.id || ''}
                          onChange={(e) =>
                            field.handleChange({
                              ...field.state.value,
                              id: e.target.value,
                            })
                          }
                          placeholder={t('Product description in Indonesian')}
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* Organization Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Organization')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label htmlFor="vendor" className="text-xs font-semibold">
                  {t('Vendor')}
                </Label>
                <form.Field name="vendor">
                  {(field) => (
                    <Input
                      id="vendor"
                      className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t('Brand name')}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-4">
                <Label htmlFor="productType" className="text-xs font-semibold">
                  {t('Product Type')}
                </Label>
                <form.Field name="productType">
                  {(field) => (
                    <Input
                      id="productType"
                      className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t('e.g., Nail Polish')}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* Search engine listing */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Search engine listing')}
            </h2>
            <div className="space-y-4">
              <Label htmlFor="handle" className="text-xs font-semibold">
                {t('Handle (URL slug)')}
              </Label>
              <form.Field name="handle">
                {(field) => (
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-medium text-sm">
                      .../products/
                    </span>
                    <Input
                      id="handle"
                      className="h-11 pl-28 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t('product-url-slug')}
                    />
                  </div>
                )}
              </form.Field>
              <p className="text-[10px] text-muted-foreground px-2">
                {t('The handle is used to generate the product URL.')}
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {/* Status Panel */}
          <section className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              {t('Status')}
            </h2>

            <form.Field name="status">
              {(field) => (
                <div className="space-y-4">
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        value as 'draft' | 'active' | 'archived',
                      )
                    }
                  >
                    <SelectTrigger className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 font-medium">
                      <SelectValue placeholder={t('Select status')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                      <SelectItem value="draft" className="py-2.5 font-medium">
                        {t('Draft')}
                      </SelectItem>
                      <SelectItem
                        value="active"
                        className="py-2.5 font-medium text-emerald-600"
                      >
                        {t('Active')}
                      </SelectItem>
                      <SelectItem
                        value="archived"
                        className="py-2.5 font-medium text-muted-foreground"
                      >
                        {t('Archived')}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                    {field.state.value === 'draft'
                      ? t('Draft products are invisible to customers.')
                      : field.state.value === 'active'
                        ? t('This product will be live in your catalog.')
                        : t('Archived products are hidden from admins.')}
                  </p>
                </div>
              )}
            </form.Field>
          </section>

          {/* Quick Actions Panel */}
          <div className="bg-card border border-border/50 rounded-3xl p-4 shadow-sm sticky top-8">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="h-12 rounded-xl bg-pink-500 hover:bg-pink-600 shadow-sm font-bold text-white disabled:opacity-50 gap-2"
                    disabled={isSubmitting || updateProduct.isPending}
                  >
                    <Save className="w-4 h-4" />
                    {updateProduct.isPending
                      ? t('Saving...')
                      : t('Save Changes')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl text-muted-foreground font-semibold text-xs"
                    onClick={() => router.navigate({ to: '/admin/products' })}
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              )}
            </form.Subscribe>

            {updateProduct.isSuccess && (
              <p className="text-emerald-500 text-[10px] font-bold text-center mt-3 animate-pulse uppercase tracking-widest">
                {t('Saved successfully!')}
              </p>
            )}
          </div>
        </aside>

        {updateProduct.isError && (
          <div className="lg:col-span-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <p className="text-destructive text-xs font-bold text-center">
              {t('Error')}: {updateProduct.error.message}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
