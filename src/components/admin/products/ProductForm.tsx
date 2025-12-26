import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Sparkles,
  Save,
  Image,
  DollarSign,
  Globe,
  Tag,
  Wand2,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ImageUploader, type ImageItem } from './ImageUploader'
import { generateProductDetailsFn } from '../../../server/ai'
import { createProductFn } from '../../../server/products'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { RichTextEditor } from '../../ui/rich-text-editor'
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

export type ProductFormData = {
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
  images: { id?: string; url: string; file?: File; altText: LocalizedString }[]
}

export type ProductImage = {
  id: string
  url: string
  altText: LocalizedString | null
  position: number
}

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
  price?: string | null
  compareAtPrice?: string | null
  sku?: string | null
  barcode?: string | null
  inventoryQuantity?: number | null
  weight?: string | null
  images?: ProductImage[]
}

type ProductFormProps = {
  product?: Product
  onBack?: () => void
}

export function ProductForm({ product, onBack }: ProductFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEditMode = !!product
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini')

  // Images state for edit mode (tracks local state separately from form)
  const initialImages: ImageItem[] = (product?.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    altText: img.altText || { en: '', fr: '', id: '' },
  }))
  const [images, setImages] = useState<ImageItem[]>(initialImages)

  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const result = await createProductFn({ data })
      if (!result.success) throw new Error('Failed to create product')
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (onBack) onBack()
    },
  })

  const updateProduct = useMutation({
    mutationFn: async (updateData: Partial<ProductFormData>) => {
      const res = await fetch(`/api/products/${product!.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['product', product!.id] })
    },
  })

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleAIGenerate = async () => {
    // In edit mode, images are stored in state; in create mode, in form field
    const imageList = isEditMode ? images : form.getFieldValue('images')
    const firstImage = imageList[0]

    if (!firstImage || !firstImage.url) {
      toast.error(t('Please add an image URL first'))
      return
    }

    setIsGenerating(true)
    try {
      let result

      const isLocalImage = firstImage.url.startsWith('blob:')

      if (isLocalImage) {
        if (!firstImage.file) {
          throw new Error('Local image file is missing')
        }
        const base64 = await fileToBase64(firstImage.file)
        result = await generateProductDetailsFn({
          data: {
            imageBase64: base64,
            mimeType: firstImage.file.type,
            provider: aiProvider,
          },
        })
      } else {
        result = await generateProductDetailsFn({
          data: { imageUrl: firstImage.url, provider: aiProvider },
        })
      }

      if (result.success) {
        form.setFieldValue('name', result.data.name)
        form.setFieldValue('description', result.data.description)
        form.setFieldValue('metaTitle', result.data.metaTitle)
        form.setFieldValue('metaDescription', result.data.metaDescription)
        form.setFieldValue('handle', result.data.handle)
        form.setFieldValue('tags', result.data.tags)
        toast.success(t('Product details generated successfully!'))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to generate product details'),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const form = useForm({
    defaultValues: {
      name: product?.name || ({ en: '', fr: '', id: '' } as LocalizedString),
      description:
        product?.description || ({ en: '', fr: '', id: '' } as LocalizedString),
      handle: product?.handle || '',
      vendor: product?.vendor || '',
      productType: product?.productType || '',
      status: product?.status || ('draft' as 'draft' | 'active' | 'archived'),
      tags: product?.tags || ([] as string[]),
      metaTitle:
        product?.metaTitle || ({ en: '', fr: '', id: '' } as LocalizedString),
      metaDescription:
        product?.metaDescription ||
        ({ en: '', fr: '', id: '' } as LocalizedString),
      price: product?.price || '',
      compareAtPrice: product?.compareAtPrice || '',
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      inventoryQuantity: product?.inventoryQuantity ?? 0,
      weight: product?.weight || '',
      images: [] as {
        id?: string
        url: string
        file?: File
        altText: LocalizedString
      }[],
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        if (isEditMode) {
          // Edit mode: upload images, save to DB, update product
          const uploadedImages = await Promise.all(
            images.map(async (img, index) => {
              const isLocalImage = img.url.startsWith('blob:')
              if (isLocalImage) {
                if (!img.file) throw new Error('Local image file is missing')
                const formData = new FormData()
                formData.append('file', img.file)
                const response = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData,
                })
                const result = await response.json()
                if (!result.success) {
                  throw new Error(result.error || t('Failed to upload image'))
                }
                return {
                  url: result.url,
                  altText: img.altText,
                  position: index,
                }
              }
              return { url: img.url, altText: img.altText, position: index }
            }),
          )

          // Save images to DB
          const res = await fetch(`/api/products/${product!.id}/images`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ images: uploadedImages }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)

          // Sync local state with uploaded URLs
          setImages(
            uploadedImages.map((img, idx) => ({
              id: images[idx]?.id || `img-${idx}`,
              url: img.url,
              altText: img.altText,
              file: undefined,
            })),
          )

          await updateProduct.mutateAsync(value)
          toast.success(t('Product saved successfully!'))
        } else {
          // Create mode: upload images then create product
          const uploadedImages = await Promise.all(
            value.images.map(async (img) => {
              if (img.file) {
                const formData = new FormData()
                formData.append('file', img.file)
                const response = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData,
                })
                const result = await response.json()
                if (!result.success) {
                  throw new Error(result.error || t('Failed to upload image'))
                }
                return { url: result.url, altText: img.altText }
              }
              return { url: img.url, altText: img.altText }
            }),
          )

          await createProduct.mutateAsync({
            ...value,
            images: uploadedImages,
          })
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t('Failed to create product'),
        )
      } finally {
        setIsSaving(false)
      }
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
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 mb-2 hover:bg-pink-500/5 hover:text-pink-600 rounded-lg transition-all font-medium text-xs text-muted-foreground"
            >
              <ArrowLeft className="w-3 h-3" />
              {t('Back to Products')}
            </Button>
          )}
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500" />
            {isEditMode ? t('Edit Product') : t('Add Product')}
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
                <Label className="text-xs font-semibold">
                  {t('Name')} <span className="text-destructive">*</span>
                </Label>
                <form.Field
                  name="name"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value.en?.trim()) {
                        return 'Product name (English) is required'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <>
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
                            className={`h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 ${field.state.meta.errors.length > 0 ? 'border-destructive' : ''}`}
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
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-destructive text-xs mt-1">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </>
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
                        <RichTextEditor
                          value={field.state.value.en || ''}
                          onChange={(val) =>
                            field.handleChange({
                              ...field.state.value,
                              en: val,
                            })
                          }
                          placeholder={t('Product description in English')}
                        />
                      </TabsContent>
                      <TabsContent value="fr" className="mt-0">
                        <RichTextEditor
                          value={field.state.value.fr || ''}
                          onChange={(val) =>
                            field.handleChange({
                              ...field.state.value,
                              fr: val,
                            })
                          }
                          placeholder={t('Product description in French')}
                        />
                      </TabsContent>
                      <TabsContent value="id" className="mt-0">
                        <RichTextEditor
                          value={field.state.value.id || ''}
                          onChange={(val) =>
                            field.handleChange({
                              ...field.state.value,
                              id: val,
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

            {isEditMode ? (
              /* Edit mode: use separate images state */
              <div className="space-y-4">
                <ImageUploader images={images} onChange={setImages} />

                {images.length > 0 && images[0]?.url && (
                  <div className="flex gap-2">
                    <Select
                      value={aiProvider}
                      onValueChange={(v) =>
                        setAiProvider(v as 'gemini' | 'openai')
                      }
                    >
                      <SelectTrigger className="w-32 h-12 rounded-2xl bg-muted/50 border-border font-semibold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      className="flex-1 h-12 rounded-2xl gap-2 font-semibold bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-lg"
                      onClick={handleAIGenerate}
                      disabled={isGenerating}
                    >
                      <Wand2 className="w-4 h-4" />
                      {isGenerating
                        ? t('Generating...')
                        : t('Generate Details with AI')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Create mode: use form field */
              <form.Field name="images">
                {(field) => (
                  <div className="space-y-4">
                    <ImageUploader
                      images={field.state.value.map((img, idx) => ({
                        id: `img-${idx}`,
                        url: img.url,
                        file: img.file,
                        altText: img.altText,
                      }))}
                      onChange={(newImages) => {
                        field.handleChange(
                          newImages.map((img) => ({
                            url: img.url,
                            file: img.file,
                            altText: img.altText,
                          })),
                        )
                      }}
                    />

                    {field.state.value.length > 0 &&
                      field.state.value[0]?.url && (
                        <div className="flex gap-2">
                          <Select
                            value={aiProvider}
                            onValueChange={(v) =>
                              setAiProvider(v as 'gemini' | 'openai')
                            }
                          >
                            <SelectTrigger className="w-32 h-12 rounded-2xl bg-muted/50 border-border font-semibold text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="gemini">Gemini</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            className="flex-1 h-12 rounded-2xl gap-2 font-semibold bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-lg"
                            onClick={handleAIGenerate}
                            disabled={isGenerating}
                          >
                            <Wand2 className="w-4 h-4" />
                            {isGenerating
                              ? t('Generating...')
                              : t('Generate Details with AI')}
                          </Button>
                        </div>
                      )}
                  </div>
                )}
              </form.Field>
            )}
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
                    {t('Handle (URL slug)')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Globe className="w-3 h-3 text-muted-foreground/30" />
                </div>
                <form.Field
                  name="handle"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value?.trim()) {
                        return 'Handle is required'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-medium text-sm">
                          .../products/
                        </span>
                        <Input
                          id="handle"
                          className={`h-11 pl-28 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 ${field.state.meta.errors.length > 0 ? 'border-destructive' : ''}`}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={t('product-url-slug')}
                        />
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-destructive text-xs mt-1">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </>
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
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="h-12 rounded-xl bg-pink-500 hover:bg-pink-600 shadow-sm font-bold text-white disabled:opacity-50 gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditMode ? t('Saving...') : t('Creating...')}
                  </>
                ) : (
                  <>
                    {isEditMode && <Save className="w-4 h-4" />}
                    {isEditMode ? t('Save Changes') : t('Create Product')}
                  </>
                )}
              </Button>
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl text-muted-foreground font-semibold text-xs"
                  onClick={onBack}
                >
                  {t('Cancel')}
                </Button>
              )}
            </div>
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
