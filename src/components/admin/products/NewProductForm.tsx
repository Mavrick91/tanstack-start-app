import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Sparkles,
  Image,
  DollarSign,
  Globe,
  Tag,
  Trash2,
  PlusCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { createProductFn } from '../../../server/products'
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

type LocalizedString = { en: string; fr?: string; id?: string }

type ProductFormData = {
  name: LocalizedString
  description: LocalizedString
  handle: string
  vendor: string
  productType: string
  status: 'draft' | 'active' | 'archived'
  tags: string[]
  metaTitle: LocalizedString
  metaDescription: LocalizedString
  price: string
  compareAtPrice: string
  sku: string
  barcode: string
  inventoryQuantity: number
  weight: string
  images: { url: string; altText: LocalizedString }[]
}

type NewProductFormProps = {
  onBack: () => void
}

export function NewProductForm({ onBack }: NewProductFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const result = await createProductFn({ data })
      if (!result.success) throw new Error('Failed to create product')
      return result.data
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
      tags: [] as string[],
      metaTitle: { en: '', fr: '', id: '' } as LocalizedString,
      metaDescription: { en: '', fr: '', id: '' } as LocalizedString,
      price: '',
      compareAtPrice: '',
      sku: '',
      barcode: '',
      inventoryQuantity: 0,
      weight: '',
      images: [] as { url: string; altText: LocalizedString }[],
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 mb-2 hover:bg-pink-500/5 hover:text-pink-600 rounded-lg transition-all font-medium text-xs text-muted-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('Back to Products')}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500" />
            {t('Add Product')}
          </h1>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm relative overflow-hidden">
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

          {/* Media Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <Image className="w-4 h-4" />
              {t('Media')}
            </h2>

            <form.Field name="images">
              {(field) => (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {field.state.value.map((image, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50 relative group"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('Remove image')}
                          className="absolute right-2 top-2 h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all z-10"
                          onClick={() => {
                            const newImages = [...field.state.value]
                            newImages.splice(index, 1)
                            field.handleChange(newImages)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('Image URL')}
                          </Label>
                          <Input
                            className="h-10 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                            value={image.url}
                            onChange={(e) => {
                              const newImages = [...field.state.value]
                              newImages[index] = {
                                ...image,
                                url: e.target.value,
                              }
                              field.handleChange(newImages)
                            }}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('Alt Text')} (EN)
                          </Label>
                          <Input
                            className="h-10 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                            value={image.altText.en}
                            onChange={(e) => {
                              const newImages = [...field.state.value]
                              newImages[index] = {
                                ...image,
                                altText: {
                                  ...image.altText,
                                  en: e.target.value,
                                },
                              }
                              field.handleChange(newImages)
                            }}
                            placeholder={t(
                              'Brief description for accessibility',
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 hover:border-pink-500/50 hover:bg-pink-500/5 rounded-2xl gap-2 text-muted-foreground hover:text-pink-600 transition-all font-semibold"
                    onClick={() => {
                      field.handleChange([
                        ...field.state.value,
                        { url: '', altText: { en: '', fr: '', id: '' } },
                      ])
                    }}
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t('Add Image URL')}
                  </Button>
                </div>
              )}
            </form.Field>
          </section>

          {/* Pricing Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('Pricing')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-semibold">
                  {t('Price')}
                </Label>
                <form.Field name="price">
                  {(field) => (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold">
                        $
                      </span>
                      <Input
                        id="price"
                        className="h-11 pl-8 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="compareAtPrice"
                  className="text-xs font-semibold"
                >
                  {t('Compare-at price')}
                </Label>
                <form.Field name="compareAtPrice">
                  {(field) => (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold">
                        $
                      </span>
                      <Input
                        id="compareAtPrice"
                        className="h-11 pl-8 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  )}
                </form.Field>
                <p className="text-[10px] text-muted-foreground px-2">
                  {t(
                    'To show a reduced price, move the original price to "Compare-at price".',
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Inventory Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Inventory')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-xs font-semibold">
                  {t('SKU (Stock Keeping Unit)')}
                </Label>
                <form.Field name="sku">
                  {(field) => (
                    <Input
                      id="sku"
                      className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="FN-001"
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-xs font-semibold">
                  {t('Barcode (ISBN, UPC, GTIN, etc.)')}
                </Label>
                <form.Field name="barcode">
                  {(field) => (
                    <Input
                      id="barcode"
                      className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="inventoryQuantity"
                className="text-xs font-semibold"
              >
                {t('Quantity Available')}
              </Label>
              <form.Field name="inventoryQuantity">
                {(field) => (
                  <Input
                    id="inventoryQuantity"
                    className="h-11 w-32 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 text-center font-bold"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    type="number"
                  />
                )}
              </form.Field>
            </div>
          </section>

          {/* Shipping Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Shipping')}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-xs font-semibold">
                {t('Weight')}
              </Label>
              <form.Field name="weight">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Input
                      id="weight"
                      className="h-11 w-32 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 text-center font-bold"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0.0"
                      type="number"
                      step="0.1"
                    />
                    <span className="text-sm font-bold text-muted-foreground">
                      kg
                    </span>
                  </div>
                )}
              </form.Field>
              <p className="text-[10px] text-muted-foreground px-1">
                {t('Used to calculate shipping rates at checkout.')}
              </p>
            </div>
          </section>

          {/* Organization Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm overflow-hidden relative">
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

            <div className="mt-6 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <Tag className="w-3 h-3" />
                {t('Tags')}
              </Label>
              <form.Field name="tags">
                {(field) => (
                  <Input
                    className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                    value={field.state.value.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                      field.handleChange(tags)
                    }}
                    placeholder={t(
                      'Separate with commas (e.g., summer, bestseller)',
                    )}
                  />
                )}
              </form.Field>
            </div>
          </section>

          {/* SEO / Handle Section */}
          <section className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              {t('Search engine listing')}
            </h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="handle" className="text-xs font-semibold">
                    {t('Handle (URL slug)')}
                  </Label>
                  <Globe className="w-3 h-3 text-muted-foreground/30" />
                </div>
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
              </div>

              <div className="space-y-4 border-t border-border/50 pt-6">
                <Label className="text-xs font-semibold">
                  {t('Meta Title')}
                </Label>
                <form.Field name="metaTitle">
                  {(field) => (
                    <Input
                      className="h-11 bg-background/50 border-border rounded-xl focus:ring-pink-500/20"
                      value={field.state.value.en}
                      onChange={(e) =>
                        field.handleChange({
                          ...field.state.value,
                          en: e.target.value,
                        })
                      }
                      placeholder={t('SEO Title (defaults to product name)')}
                    />
                  )}
                </form.Field>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-semibold">
                  {t('Meta Description')}
                </Label>
                <form.Field name="metaDescription">
                  {(field) => (
                    <Textarea
                      className="bg-background/50 border-border rounded-xl focus:ring-pink-500/20 min-h-[80px]"
                      value={field.state.value.en}
                      onChange={(e) =>
                        field.handleChange({
                          ...field.state.value,
                          en: e.target.value,
                        })
                      }
                      placeholder={t(
                        'SEO Description (defaults to product description)',
                      )}
                    />
                  )}
                </form.Field>
              </div>
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
                    className="h-12 rounded-xl bg-pink-500 hover:bg-pink-600 shadow-sm font-bold text-white disabled:opacity-50"
                    disabled={isSubmitting || createProduct.isPending}
                  >
                    {createProduct.isPending
                      ? t('Creating...')
                      : t('Create Product')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl text-muted-foreground font-semibold text-xs"
                    onClick={onBack}
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </div>
        </aside>

        {createProduct.isError && (
          <div className="lg:col-span-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <p className="text-destructive text-xs font-bold text-center">
              {t('Error')}: {createProduct.error.message}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
