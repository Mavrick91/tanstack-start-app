import { Fancybox } from '@fancyapps/ui'
import '@fancyapps/ui/dist/fancybox/fancybox.css'
import { useMutation } from '@tanstack/react-query'
import {
  Wand2,
  Loader2,
  Check,
  X,
  Plus,
  Trash2,
  ImageIcon,
  Sparkles,
  AlertCircle,
  Clipboard,
  RefreshCw,
  Send,
  Pencil,
  RotateCcw,
  Filter,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { MediaLibrary, type MediaItem } from '../media/MediaLibrary'
import { type ProductVariant } from './components/ProductVariantsTable'
import { getOptimizedImageUrl } from '../../../lib/cloudinary'
import { cn } from '../../../lib/utils'
import {
  generateBatchCompositeImagesFn,
  regenerateImageFn,
  type AspectRatio,
} from '../../../server/ai'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog'
import { ScrollArea } from '../../ui/scroll-area'
import { Separator } from '../../ui/separator'
import { Textarea } from '../../ui/textarea'

export type AIGeneratedImage = {
  base64: string
  mimeType: string
  variantId: string
  altText: string
}

export type AIProductGeneratorProps = {
  open: boolean
  onClose: () => void
  variants: ProductVariant[]
  productImages: { id?: string; url: string; altText: { en: string } }[]
  onKeepImages: (images: AIGeneratedImage[]) => void
}

type GeneratedResult = {
  backgroundId: string
  variantId: string
  variantTitle: string
  imageBase64: string
  mimeType: string
  error?: string
  status:
    | 'pending'
    | 'success'
    | 'error'
    | 'kept'
    | 'discarded'
    | 'regenerating'
}

type ProductImageSource = {
  type: 'url' | 'clipboard'
  url?: string
  base64?: string
  mimeType?: string
}

const NAIL_SHAPES = [
  'almond',
  'coffin',
  'stiletto',
  'square',
  'oval',
  'round',
  'ballerina',
  'squoval',
] as const

const SHAPE_DESCRIPTIONS: Record<string, string> = {
  almond:
    'Almond shape - tapered sides with a rounded peak, resembling an almond nut. Elegant and elongating, slimmer than oval with a soft pointed tip.',
  coffin:
    'Coffin/Ballerina shape - tapered sides with a flat, squared-off tip. The nail narrows toward the tip then cuts straight across.',
  stiletto:
    'Stiletto shape - sharply pointed tip like a stiletto heel. Dramatic taper from base to a sharp point.',
  square:
    'Square shape - straight sides with a flat, squared-off tip at 90-degree angles. Classic and clean.',
  oval: 'Oval shape - rounded edges following the natural nail curve with a soft, egg-shaped tip. Classic and feminine.',
  round:
    'Round shape - follows the natural curve of the fingertip in a semicircle. Natural-looking, soft curved tip.',
  ballerina:
    'Ballerina shape - same as coffin, tapered sides with flat squared tip, resembling a ballet slipper.',
  squoval:
    'Squoval shape - combination of square and oval, squared tip with softened rounded corners.',
}

const LENGTH_DESCRIPTIONS: Record<string, string> = {
  xs: 'XS length (~8-10mm total nail length) - very short, barely past the fingertip. Most natural look.',
  s: 'S length (~10-12mm total nail length) - short, extends just slightly past the fingertip. Natural, practical.',
  m: 'M length (~15-18mm total nail length) - medium, extends moderately past the fingertip. Balanced look.',
  l: 'L length (~20-22mm total nail length) - long, extends noticeably past the fingertip. Glamorous appearance.',
  xl: 'XL length (~25-28mm total nail length) - extra long, extends significantly past the fingertip. Dramatic look.',
  xxl: 'XXL length (~30-35mm+ total nail length) - maximum length, extends far past the fingertip. Statement nails.',
}

function toDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}

function buildVariantPrompt(variantTitle: string): string {
  const title = variantTitle.toLowerCase()

  // Extract shape
  let shape = ''
  for (const s of NAIL_SHAPES) {
    if (title.includes(s)) {
      shape = s
      break
    }
  }

  let length = ''
  const sizeLengths = ['xxl', 'xl', 'xs', 's', 'm', 'l']
  for (const s of sizeLengths) {
    const regex = new RegExp(`\\b${s}\\b`, 'i')
    if (regex.test(title)) {
      length = s
      break
    }
  }

  const details: string[] = []

  if (shape) {
    details.push(SHAPE_DESCRIPTIONS[shape] || `${shape} shape`)
  }

  if (length) {
    details.push(LENGTH_DESCRIPTIONS[length] || `${length} length`)
  }

  if (details.length === 0) return ''

  return `

VARIANT SPECIFICATIONS - "${variantTitle}":
${details.map((d) => `• ${d}`).join('\n')}

IMPORTANT FOR THIS VARIANT:
- Render the nails with the exact shape and length described above
- Keep the EXACT same nail design, art, colors, and patterns from the second image
- Only adjust the nail SHAPE and LENGTH to match these variant specifications`
}

export function AIProductGenerator({
  open,
  onClose,
  variants,
  productImages,
  onKeepImages,
}: AIProductGeneratorProps) {
  const { t } = useTranslation()
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<MediaItem[]>(
    [],
  )
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(),
  )
  const [productImage, setProductImage] = useState<ProductImageSource | null>(
    null,
  )
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [results, setResults] = useState<GeneratedResult[]>([])
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')

  const [editingResult, setEditingResult] = useState<GeneratedResult | null>(
    null,
  )
  const [editPrompt, setEditPrompt] = useState('')
  const [showKeptOnly, setShowKeptOnly] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const getVariantId = (variant: ProductVariant, index: number) =>
    variant.id || `temp-${index}`

  useEffect(() => {
    if (variants.length > 0 && selectedVariantIds.size === 0) {
      setSelectedVariantIds(new Set(variants.map((v, i) => getVariantId(v, i))))
    }
    // Only run on mount/variants change, not when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants])

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!open) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = (event) => {
            const result = event.target?.result as string
            const base64 = result.split(',')[1]
            setProductImage({
              type: 'clipboard',
              base64,
              mimeType: file.type,
            })
          }
          reader.readAsDataURL(file)
          break
        }
      }
    },
    [open],
  )

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  useEffect(() => {
    if (productImages.length > 0 && !productImage) {
      setProductImage({
        type: 'url',
        url: productImages[0].url,
      })
    }
  }, [productImages, productImage])

  const fancyboxOpenRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    Fancybox.bind('[data-fancybox="ai-results"]', {
      on: {
        init: () => {
          fancyboxOpenRef.current = true
        },
        close: () => {
          fancyboxOpenRef.current = false
        },
      },
    } as unknown as Parameters<typeof Fancybox.bind>[1])

    return () => {
      Fancybox.destroy()
    }
  }, [results])

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedVariantsWithIds = variants
        .map((v, index) => ({ variant: v, variantId: getVariantId(v, index) }))
        .filter(({ variantId }) => selectedVariantIds.has(variantId))

      if (selectedBackgrounds.length === 0 || !productImage) {
        throw new Error(t('Please select backgrounds and a product image'))
      }

      if (selectedVariantsWithIds.length === 0) {
        throw new Error(t('Please select at least one variant'))
      }

      const newResults: GeneratedResult[] = []
      for (const bg of selectedBackgrounds) {
        for (const { variant, variantId } of selectedVariantsWithIds) {
          newResults.push({
            backgroundId: bg.id,
            variantId,
            variantTitle: variant.title,
            imageBase64: '',
            mimeType: '',
            status: 'pending',
          })
        }
      }
      setResults((prev) => [...newResults, ...prev])

      const backgroundsData = await Promise.all(
        selectedBackgrounds.map(async (bg) => ({
          id: bg.id,
          base64: await urlToBase64(bg.url),
          mimeType: 'image/jpeg',
        })),
      )

      let productBase64: string
      let productMimeType: string

      if (productImage.type === 'clipboard' && productImage.base64) {
        productBase64 = productImage.base64
        productMimeType = productImage.mimeType || 'image/png'
      } else if (productImage.url) {
        productBase64 = await urlToBase64(productImage.url)
        productMimeType = 'image/jpeg'
      } else {
        throw new Error(t('No product image selected'))
      }

      const generationPromises = selectedVariantsWithIds.map(
        async ({ variant, variantId }) => {
          const variantPrompt = buildVariantPrompt(variant.title) || undefined

          const variantsData = [
            {
              id: variantId,
              base64: productBase64,
              mimeType: productMimeType,
            },
          ]

          try {
            const response = await generateBatchCompositeImagesFn({
              data: {
                backgrounds: backgroundsData,
                variants: variantsData,
                prompt: variantPrompt,
                aspectRatio,
              },
            })

            if (response.success) {
              return response.data.map((item) => ({
                backgroundId: item.backgroundId,
                variantId: item.variantId,
                variantTitle: variant.title,
                imageBase64: item.imageBase64,
                mimeType: item.mimeType,
                error: item.error,
                status: (item.error
                  ? 'error'
                  : 'success') as GeneratedResult['status'],
              }))
            }
            return []
          } catch (err) {
            return selectedBackgrounds.map((bg) => ({
              backgroundId: bg.id,
              variantId,
              variantTitle: variant.title,
              imageBase64: '',
              mimeType: '',
              error: err instanceof Error ? err.message : 'Generation failed',
              status: 'error' as GeneratedResult['status'],
            }))
          }
        },
      )

      const resultsArrays = await Promise.all(generationPromises)
      const allResults = resultsArrays.flat()

      return allResults
    },
    onSuccess: (data) => {
      setResults((prev) => {
        const others = prev.filter((r) => r.status !== 'pending')
        return [...data, ...others]
      })
    },
    onError: (error) => {
      setResults((prev) => prev.filter((r) => r.status !== 'pending'))
      toast.error(
        error instanceof Error ? error.message : t('Generation failed'),
      )
    },
  })

  const getProductImageBase64 = useCallback(async (): Promise<
    { base64: string; mimeType: string } | undefined
  > => {
    if (!productImage) return undefined

    if (productImage.type === 'clipboard' && productImage.base64) {
      return {
        base64: productImage.base64,
        mimeType: productImage.mimeType || 'image/png',
      }
    }

    if (productImage.url) {
      try {
        const base64 = await urlToBase64(productImage.url)
        return { base64, mimeType: 'image/jpeg' }
      } catch {
        return undefined
      }
    }

    return undefined
  }, [productImage])

  const updateResult = (
    result: GeneratedResult,
    updates: Partial<GeneratedResult>,
  ) => {
    setResults((prev) =>
      prev.map((r) =>
        r.backgroundId === result.backgroundId &&
        r.variantId === result.variantId
          ? { ...r, ...updates }
          : r,
      ),
    )
  }

  const handleRegenerate = async (
    result: GeneratedResult,
    prompt: string,
    referenceImage?: { base64: string; mimeType: string },
  ) => {
    updateResult(result, { status: 'regenerating' })

    try {
      const response = await regenerateImageFn({
        data: {
          existingImage: {
            base64: result.imageBase64,
            mimeType: result.mimeType,
          },
          referenceImage,
          editPrompt: prompt,
          aspectRatio,
        },
      })

      updateResult(result, {
        imageBase64: response.data.imageBase64,
        mimeType: response.data.mimeType,
        status: 'success',
      })
    } catch (error) {
      updateResult(result, { status: 'success' })
      toast.error(
        error instanceof Error ? error.message : t('Regeneration failed'),
      )
    }
  }

  const handleKeep = (result: GeneratedResult) => {
    if (!result.imageBase64) return
    updateResult(result, { status: 'kept' })
  }

  const handleEdit = (result: GeneratedResult) => {
    setEditingResult(result)
    setEditPrompt('')
  }

  const handleRetry = async (result: GeneratedResult) => {
    const variantPrompt = buildVariantPrompt(result.variantTitle) || undefined
    const referenceImage = await getProductImageBase64()
    if (referenceImage) {
      handleRegenerate(
        result,
        variantPrompt || 'Regenerate this image with the same specifications.',
        referenceImage,
      )
    }
  }

  const handleSubmitEdit = async () => {
    if (!editingResult || !editPrompt.trim()) return

    const resultToEdit = editingResult
    const promptToUse = editPrompt
    setEditingResult(null)
    setEditPrompt('')

    const referenceImage = await getProductImageBase64()
    handleRegenerate(resultToEdit, promptToUse, referenceImage)
  }

  const getKeptImages = (): AIGeneratedImage[] => {
    return results
      .filter((r) => r.status === 'kept' && r.imageBase64)
      .map((r) => ({
        base64: r.imageBase64,
        mimeType: r.mimeType,
        variantId: r.variantId,
        altText: `AI Generated - ${r.variantTitle}`,
      }))
  }

  const handleCloseRequest = () => {
    const keptImages = getKeptImages()
    if (keptImages.length > 0) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    const keptImages = getKeptImages()
    onKeepImages(keptImages)
    setShowCloseConfirm(false)
    onClose()
  }

  const handleDiscardAndClose = () => {
    setShowCloseConfirm(false)
    onClose()
  }

  const handleDiscard = (result: GeneratedResult) => {
    setResults((prev) => prev.filter((r) => r !== result))
  }

  const totalToGenerate = selectedBackgrounds.length * selectedVariantIds.size

  const keptCount = results.filter((r) => r.status === 'kept').length

  const hasResults = results.length > 0
  const filteredResults = showKeptOnly
    ? results.filter((r) => r.status === 'kept')
    : results

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && fancyboxOpenRef.current) return
        if (!val) handleCloseRequest()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!max-w-[95vw] !sm:max-w-[95vw] w-full h-[95vh] !flex !flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden"
        onEscapeKeyDown={(e) => {
          if (fancyboxOpenRef.current) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (fancyboxOpenRef.current) e.preventDefault()
        }}
      >
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t('AI Studio')}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground">
                {t('Generate product images for each variant')}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasResults && (
              <Button
                variant={showKeptOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowKeptOnly(!showKeptOnly)}
                className={
                  showKeptOnly ? 'bg-indigo-600 hover:bg-indigo-700' : ''
                }
              >
                <Filter className="w-4 h-4 mr-1" />
                {showKeptOnly ? t('Kept') : t('All')} (
                {showKeptOnly ? keptCount : results.length})
              </Button>
            )}
            {keptCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleCloseRequest}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {t('Done')} ({keptCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseRequest}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: CONFIGURATION */}
          <div className="w-96 border-r border-border/50 bg-muted/10 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 h-0">
              <div className="p-6 space-y-6">
                {/* 1. Backgrounds */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[10px] font-black">
                        1
                      </span>
                      {t('Backgrounds')}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                      onClick={() => setIsMediaLibraryOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> {t('Add')}
                    </Button>
                  </div>

                  {selectedBackgrounds.length === 0 ? (
                    <div
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-muted/50 hover:border-pink-500/30 transition-all group"
                    >
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30 group-hover:text-pink-500/50 transition-colors" />
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('Select environment images')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedBackgrounds.map((bg) => (
                        <div
                          key={bg.id}
                          className="relative aspect-square rounded-lg overflow-hidden group border border-border shadow-sm"
                        >
                          <img
                            src={getOptimizedImageUrl(bg.url, 'small')}
                            className="w-full h-full object-cover"
                            alt="background"
                          />
                          <button
                            onClick={() =>
                              setSelectedBackgrounds((prev) =>
                                prev.filter((b) => b.id !== bg.id),
                              )
                            }
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* 2. Product Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                        2
                      </span>
                      {t('Product Image')}
                    </h3>
                    {productImage && !hasResults && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setProductImage(null)}
                      >
                        <X className="w-3 h-3 mr-1" /> {t('Clear')}
                      </Button>
                    )}
                  </div>

                  {!productImage ? (
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/10">
                        <Clipboard className="w-6 h-6 text-indigo-400" />
                        <p className="text-xs text-indigo-600 font-semibold">
                          {t('Paste image from clipboard')}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {t('Press Ctrl+V or Cmd+V')}
                        </p>
                      </div>

                      {productImages.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex-1 h-px bg-border" />
                            <span>{t('or select from product')}</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {productImages.slice(0, 8).map((img, idx) => (
                              <button
                                key={img.id || idx}
                                onClick={() =>
                                  setProductImage({ type: 'url', url: img.url })
                                }
                                className="aspect-square rounded-lg overflow-hidden border border-border hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all"
                              >
                                <img
                                  src={getOptimizedImageUrl(img.url, 'small')}
                                  className="w-full h-full object-cover"
                                  alt={img.altText?.en || `Image ${idx + 1}`}
                                />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg">
                      {productImage.type === 'clipboard' &&
                      productImage.base64 ? (
                        <img
                          src={`data:${productImage.mimeType};base64,${productImage.base64}`}
                          className="w-full h-full object-contain bg-white"
                          alt="Pasted product"
                        />
                      ) : productImage.url ? (
                        <img
                          src={getOptimizedImageUrl(productImage.url, 'medium')}
                          className="w-full h-full object-contain bg-white"
                          alt="Selected product"
                        />
                      ) : null}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                        <p className="text-[10px] text-white font-medium">
                          {productImage.type === 'clipboard'
                            ? t('Pasted from clipboard')
                            : t('Product image')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* 3. Variants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black">
                        3
                      </span>
                      {t('Variants')}
                      {selectedVariantIds.size > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({selectedVariantIds.size} {t('selected')})
                        </span>
                      )}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => {
                        if (selectedVariantIds.size === variants.length) {
                          setSelectedVariantIds(new Set())
                        } else {
                          setSelectedVariantIds(
                            new Set(variants.map((v, i) => getVariantId(v, i))),
                          )
                        }
                      }}
                    >
                      {selectedVariantIds.size === variants.length
                        ? t('Deselect All')
                        : t('Select All')}
                    </Button>
                  </div>

                  {variants.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {t('No variants available')}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {variants.map((variant, index) => {
                        const variantId = getVariantId(variant, index)
                        const isSelected = selectedVariantIds.has(variantId)
                        return (
                          <div
                            key={variantId}
                            onClick={() => {
                              const next = new Set(selectedVariantIds)
                              if (isSelected) {
                                next.delete(variantId)
                              } else {
                                next.add(variantId)
                              }
                              setSelectedVariantIds(next)
                            }}
                            className={cn(
                              'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all',
                              isSelected
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                                : 'border-border hover:bg-muted/50',
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-muted-foreground/40',
                              )}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {variant.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {variant.price}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* 4. Aspect Ratio */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black">
                      4
                    </span>
                    {t('Aspect Ratio')}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['4:5', '1:1', '3:4'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={cn(
                          'p-2 rounded-lg border text-xs font-medium transition-all',
                          aspectRatio === ratio
                            ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20'
                            : 'border-border hover:bg-muted/50',
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {aspectRatio === '4:5' &&
                      t('Shopify default - best for product cards')}
                    {aspectRatio === '1:1' && t('Square - works everywhere')}
                    {aspectRatio === '3:4' &&
                      t('Portrait - good for lifestyle shots')}
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
              <Button
                size="lg"
                className="w-full rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-purple-500/20 text-white"
                disabled={
                  selectedBackgrounds.length === 0 ||
                  !productImage ||
                  selectedVariantIds.size === 0 ||
                  generateMutation.status === 'pending'
                }
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.status === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Generating...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('Generate {{count}} Images', { count: totalToGenerate })}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* MAIN AREA: RESULTS */}
          <div className="flex-1 bg-muted/5 p-6 overflow-hidden flex flex-col">
            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-6">
                <div className="w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center">
                  <Wand2 className="w-12 h-12 opacity-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {t('Ready to Create')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {t(
                      'Select backgrounds, a product image, and variants to generate images.',
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                  {filteredResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'relative group aspect-square rounded-xl overflow-hidden bg-background border shadow-sm transition-all',
                        result.status === 'kept'
                          ? 'ring-2 ring-emerald-500 ring-offset-2'
                          : '',
                      )}
                    >
                      {result.status === 'pending' ||
                      result.status === 'regenerating' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/20 relative">
                          {/* Show original image faded in background when regenerating */}
                          {result.status === 'regenerating' &&
                            result.imageBase64 && (
                              <img
                                src={toDataUrl(
                                  result.imageBase64,
                                  result.mimeType,
                                )}
                                className="absolute inset-0 w-full h-full object-cover opacity-30"
                                alt="Regenerating"
                              />
                            )}
                          <div className="relative z-10 flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-xs font-medium text-muted-foreground animate-pulse">
                              {result.status === 'regenerating'
                                ? t('Regenerating...')
                                : t('Generating...')}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {result.variantTitle}
                            </p>
                          </div>
                        </div>
                      ) : result.error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-50 text-red-500 p-4 text-center">
                          <AlertCircle className="w-8 h-8" />
                          <p className="text-xs font-medium">{t('Failed')}</p>
                          <p className="text-[10px] opacity-70 mb-2">
                            {result.error}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-100"
                            onClick={() => handleRetry(result)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {t('Retry')}
                          </Button>
                        </div>
                      ) : result.imageBase64 ? (
                        <>
                          <a
                            href={toDataUrl(
                              result.imageBase64,
                              result.mimeType,
                            )}
                            data-fancybox="ai-results"
                            data-caption={result.variantTitle}
                            className="block w-full h-full cursor-zoom-in"
                          >
                            <img
                              src={toDataUrl(
                                result.imageBase64,
                                result.mimeType,
                              )}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              alt="Generated"
                            />
                          </a>
                          {/* Variant label */}
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 pointer-events-none">
                            <p className="text-[10px] text-white font-medium truncate max-w-[120px]">
                              {result.variantTitle}
                            </p>
                          </div>
                          {/* Action Overlay */}
                          <div
                            className={cn(
                              'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity flex flex-col justify-end p-3 gap-2',
                              result.status === 'kept'
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100',
                            )}
                          >
                            {result.status === 'kept' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full bg-emerald-600/80 hover:bg-emerald-700 text-white font-bold h-8 rounded-lg text-xs"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  updateResult(result, { status: 'success' })
                                }}
                              >
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                {t('Selected')}
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-white text-black hover:bg-white/90 font-bold h-8 rounded-lg text-xs"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleKeep(result)
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" />{' '}
                                  {t('Keep')}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleRetry(result)
                                  }}
                                  title={t('Retry')}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleEdit(result)
                                  }}
                                  title={t('Edit with AI')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDiscard(result)
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <MediaLibrary
          open={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
          onSelect={(items) =>
            setSelectedBackgrounds((prev) => [...prev, ...items])
          }
        />

        {/* Edit Image Dialog */}
        <Dialog
          open={!!editingResult}
          onOpenChange={(val) => {
            if (!val) {
              setEditingResult(null)
              setEditPrompt('')
            }
          }}
        >
          <DialogContent className="!max-w-xl">
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500" />
              {t('Edit Image with AI')}
            </DialogTitle>
            <DialogDescription>
              {t('Describe what changes you want to make to this image')}
            </DialogDescription>

            {editingResult && (
              <div className="space-y-4 mt-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={toDataUrl(
                      editingResult.imageBase64,
                      editingResult.mimeType,
                    )}
                    className="w-full h-full object-contain"
                    alt="Current"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                    <p className="text-[10px] text-white font-medium">
                      {editingResult.variantTitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder={t(
                      'e.g., Make the nails longer, change the angle slightly, add more shine...',
                    )}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingResult(null)
                      setEditPrompt('')
                    }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmitEdit}
                    disabled={!editPrompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {t('Regenerate')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Close Confirmation Dialog */}
        <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <DialogContent className="!max-w-md">
            <DialogTitle>{t('Save selected images?')}</DialogTitle>
            <DialogDescription>
              {t(
                'You have {{count}} selected images. Would you like to add them to the product?',
                { count: keptCount },
              )}
            </DialogDescription>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={handleDiscardAndClose}>
                {t('Discard')}
              </Button>
              <Button
                onClick={handleConfirmClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {t('Add to product')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const res = reader.result as string
          const base64 = res.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      .catch((err) => {
        console.error('Failed to convert image to base64', err)
        reject(new Error('Failed to load image'))
      })
  })
}
