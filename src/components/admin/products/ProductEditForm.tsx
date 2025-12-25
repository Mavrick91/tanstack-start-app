import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'
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

export type LocalizedString = { en: string; fr?: string; id?: string }

export type Product = {
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

export function ProductEditForm({ product }: { product: Product }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const router = useRouter()

  const updateProduct = useMutation({
    mutationFn: async (updateData: {
      name: LocalizedString
      description: LocalizedString
      handle: string
      vendor: string
      productType: string
      status: 'draft' | 'active' | 'archived'
    }) => {
      const res = await fetch(`/api/products/${product.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['product', product.id] })
    },
  })

  const form = useForm({
    defaultValues: {
      name: product.name || ({ en: '', fr: '', id: '' } as LocalizedString),
      description:
        product.description || ({ en: '', fr: '', id: '' } as LocalizedString),
      handle: product.handle || '',
      vendor: product.vendor || '',
      productType: product.productType || '',
      status: product.status || 'draft',
    },
    onSubmit: async ({ value }) => {
      updateProduct.mutate(value)
    },
  })

  const generateHandle = () => {
    const name = form.getFieldValue('name')
    const handle = name.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    form.setFieldValue('handle', handle)
  }

  return (
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
                    field.handleChange(value as 'draft' | 'active' | 'archived')
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
                  {updateProduct.isPending ? t('Saving...') : t('Save Changes')}
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
        <div className="lg:col-span-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl mt-4">
          <p className="text-destructive text-xs font-bold text-center">
            {t('Error')}: {updateProduct.error.message}
          </p>
        </div>
      )}
    </form>
  )
}
