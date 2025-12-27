import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Sparkles,
  Save,
  Image,
  Globe,
  Tag,
  Wand2,
  Loader2,
  ImagePlus,
  LayoutGrid,
  Settings2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ProductOptions, type ProductOption } from './components/ProductOptions'
import {
  ProductVariantsTable,
  type ProductVariant,
} from './components/ProductVariantsTable'
import { ImageUploader, type ImageItem } from './ImageUploader'
import { cn } from '../../../lib/utils'
import { generateProductDetailsFn } from '../../../server/ai'
import { createProductFn } from '../../../server/products'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card'
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
import { MediaLibrary, type MediaItem } from '../media/MediaLibrary'

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
  options?: ProductOption[]
  variants?: {
    title: string
    price: string
    sku?: string
    available: boolean
    selectedOptions: { name: string; value: string }[]
  }[]
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
  options?: { name: string; values: string[] }[]
  variants?: {
    id: string
    title: string
    price: string
    sku?: string | null
    available: number
    selectedOptions: { name: string; value: string }[] | null
  }[]
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
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)

  // Images state for edit mode (tracks local state separately from form)
  const initialImages: ImageItem[] = (product?.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    altText: img.altText || { en: '', fr: '', id: '' },
  }))
  const [images, setImages] = useState<ImageItem[]>(initialImages)

  // Options and Variants state - initialize from product if editing
  const [options, setOptions] = useState<ProductOption[]>(() => {
    if (product?.options && product.options.length > 0) {
      return product.options.map((o) => ({ name: o.name, values: o.values }))
    }
    return []
  })
  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku || undefined,
        available: v.available === 1,
        selectedOptions: v.selectedOptions || [],
      }))
    }
    return [
      {
        title: 'Default Title',
        price: '0',
        available: true,
        selectedOptions: [],
      },
    ]
  })

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

          await updateProduct.mutateAsync({
            ...value,
            options: options.map((o) => ({ name: o.name, values: o.values })),
            variants: variants.map((v) => ({
              title: v.title,
              price: v.price,
              sku: v.sku,
              available: v.available,
              selectedOptions: v.selectedOptions,
            })),
          })
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
            options: options.map((o) => ({ name: o.name, values: o.values })),
            variants: variants.map((v) => ({
              title: v.title,
              price: v.price,
              sku: v.sku,
              available: v.available,
              selectedOptions: v.selectedOptions,
            })),
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                {isEditMode ? (
                  product?.name.en
                ) : (
                  <span className="text-muted-foreground">
                    {t('Create Product')}
                  </span>
                )}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'uppercase tracking-widest text-[10px] py-0.5 px-2 rounded-lg font-bold border-border',
                  isEditMode
                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
                )}
              >
                {isEditMode ? t('Editing') : t('Creating')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-medium">
              {isEditMode
                ? t('Manage your products and inventory')
                : t(
                    'Start building your catalog by adding your first product.',
                  )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-xl border-border/50"
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => form.handleSubmit()}
            disabled={isSaving}
            className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black px-6 shadow-lg shadow-pink-500/20"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? t('Save Changes') : t('Create Product')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Details Section */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                {t('Product Details')}
              </CardTitle>
              <CardDescription>{t('Product Details')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Locale Tabs */}
              <div className="space-y-2">
                <Label className="text-sm font-bold">
                  {t('Name')} <span className="text-pink-500">*</span>
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
                            className={`h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 focus:border-pink-500 ${field.state.meta.errors.length > 0 ? 'border-destructive' : ''}`}
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
                            className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 focus:border-pink-500"
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
                            className="h-12 bg-background/50 border-border rounded-xl focus:ring-pink-500/20 focus:border-pink-500"
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
                <Label className="text-sm font-bold">{t('Description')}</Label>
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
            </CardContent>
          </Card>

          {/* Media Section */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Image className="h-5 w-5 text-violet-500" />
                {t('Media')}
              </CardTitle>
              <CardDescription>{t('Media')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditMode ? (
                /* Edit mode: use separate images state */
                <div className="space-y-4">
                  <ImageUploader images={images} onChange={setImages} />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl gap-2 font-semibold border-dashed"
                    onClick={() => setIsMediaLibraryOpen(true)}
                  >
                    <ImagePlus className="w-4 h-4" />
                    {t('Add from Media Library')}
                  </Button>

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

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 rounded-xl gap-2 font-semibold border-dashed"
                        onClick={() => setIsMediaLibraryOpen(true)}
                      >
                        <ImagePlus className="w-4 h-4" />
                        {t('Add from Media Library')}
                      </Button>

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

              {/* Media Library Modal */}
              <MediaLibrary
                open={isMediaLibraryOpen}
                onClose={() => setIsMediaLibraryOpen(false)}
                onSelect={(selectedItems: MediaItem[]) => {
                  const newImages: ImageItem[] = selectedItems.map((item) => ({
                    id: item.id,
                    url: item.url,
                    altText: item.altText || { en: '', fr: '', id: '' },
                  }))
                  if (isEditMode) {
                    setImages((prev) => [...prev, ...newImages])
                  } else {
                    const current = form.getFieldValue('images')
                    form.setFieldValue('images', [
                      ...current,
                      ...newImages.map((img) => ({
                        url: img.url,
                        altText: img.altText,
                      })),
                    ])
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Options Section */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-500" />
                {t('Options')}
              </CardTitle>
              <CardDescription>
                {t(
                  'Add options like Shape, Length, or Size to create variants',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductOptions
                options={options}
                onChange={(newOptions) => {
                  setOptions(newOptions)
                  // Auto-generate variants when options change
                  if (newOptions.length === 0) {
                    setVariants([
                      {
                        title: 'Default Title',
                        price: '0',
                        available: true,
                        selectedOptions: [],
                      },
                    ])
                  } else {
                    // Generate Cartesian product of all option values
                    const generateCombinations = (
                      opts: ProductOption[],
                    ): ProductVariant[] => {
                      if (opts.length === 0) return []
                      const [first, ...rest] = opts
                      if (rest.length === 0) {
                        return first.values.map((v) => ({
                          title: v,
                          price: variants[0]?.price || '0',
                          available: true,
                          selectedOptions: [{ name: first.name, value: v }],
                        }))
                      }
                      const restCombos = generateCombinations(rest)
                      const result: ProductVariant[] = []
                      for (const v of first.values) {
                        for (const combo of restCombos) {
                          result.push({
                            title: `${v} / ${combo.title}`,
                            price: combo.price,
                            available: true,
                            selectedOptions: [
                              { name: first.name, value: v },
                              ...combo.selectedOptions,
                            ],
                          })
                        }
                      }
                      return result
                    }
                    const validOptions = newOptions.filter(
                      (o) => o.name && o.values.length > 0,
                    )
                    if (validOptions.length > 0) {
                      setVariants(generateCombinations(validOptions))
                    }
                  }
                }}
                disabled={isSaving}
              />
            </CardContent>
          </Card>

          {/* Variants Section */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-emerald-500" />
                {t('Variants')}
              </CardTitle>
              <CardDescription>
                {t('Manage your products and inventory')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductVariantsTable
                variants={variants}
                onChange={setVariants}
                disabled={isSaving}
              />
            </CardContent>
          </Card>

          {/* SEO / Handle Section */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-500" />
                {t('Search Engine Listing')}
              </CardTitle>
              <CardDescription>{t('Search engine listing')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="handle" className="text-sm font-bold">
                    {t('Handle')} <span className="text-pink-500">*</span>
                  </Label>
                </div>
                <form.Field
                  name="handle"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value?.trim()) return 'Handle is required'
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        /
                      </span>
                      <Input
                        id="handle"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="pl-6 h-12 rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 font-mono text-sm"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="space-y-4 border-t border-border/50 pt-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="metaTitle" className="text-sm font-bold">
                    {t('Meta Title')}
                  </Label>
                </div>
                <form.Field name="metaTitle">
                  {(field) => (
                    <Input
                      id="metaTitle"
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500"
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
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="metaDescription"
                    className="text-sm font-bold"
                  >
                    {t('Meta Description')}
                  </Label>
                </div>
                <form.Field name="metaDescription">
                  {(field) => (
                    <Textarea
                      id="metaDescription"
                      className="min-h-[100px] rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden sticky top-8">
            <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-teal-500" />
                {t('Status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form.Field name="status">
                {(field) => (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">{t('Status')}</Label>
                    <div className="flex bg-muted/30 p-1 rounded-2xl gap-1 border border-border/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.handleChange('draft')}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                          field.state.value === 'draft'
                            ? 'bg-slate-100 text-slate-700 shadow-sm border border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1.5 transition-all',
                            field.state.value === 'draft'
                              ? 'bg-slate-500 scale-125'
                              : 'bg-slate-400',
                          )}
                        />
                        {t('Draft')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.handleChange('active')}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                          field.state.value === 'active'
                            ? 'bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1.5 transition-all',
                            field.state.value === 'active'
                              ? 'bg-emerald-500 scale-125'
                              : 'bg-emerald-500/50',
                          )}
                        />
                        {t('Active')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.handleChange('archived')}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                          field.state.value === 'archived'
                            ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1.5 transition-all',
                            field.state.value === 'archived'
                              ? 'bg-amber-500 scale-125'
                              : 'bg-amber-500/50',
                          )}
                        />
                        {t('Archived')}
                      </Button>
                    </div>
                  </div>
                )}
              </form.Field>

              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="text-sm font-bold">
                    {t('Vendor')}
                  </Label>
                  <form.Field name="vendor">
                    {(field) => (
                      <Input
                        id="vendor"
                        className="h-11 bg-background/50 border-border/50 rounded-xl focus:ring-pink-500/20"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t('Brand name')}
                      />
                    )}
                  </form.Field>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productType" className="text-sm font-bold">
                    {t('Product Type')}
                  </Label>
                  <form.Field name="productType">
                    {(field) => (
                      <Input
                        id="productType"
                        className="h-11 bg-background/50 border-border/50 rounded-xl focus:ring-pink-500/20"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t('e.g., Nail Polish')}
                      />
                    )}
                  </form.Field>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    {t('Tags')}
                  </Label>
                  <form.Field name="tags">
                    {(field) => (
                      <Input
                        className="h-11 bg-background/50 border-border/50 rounded-xl focus:ring-pink-500/20"
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
              </div>
            </CardContent>
          </Card>
        </div>

        {createProduct.isError && (
          <div className="lg:col-span-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <p className="text-destructive text-xs font-bold text-center">
              {t('Error')}: {createProduct.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
