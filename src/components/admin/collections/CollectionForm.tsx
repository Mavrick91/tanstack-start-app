import { useForm } from '@tanstack/react-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  Search,
  ImageIcon,
  LayoutGrid,
  Check,
  Globe,
  Settings2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  addProductsToCollectionFn,
  removeProductFromCollectionFn,
  reorderCollectionProductsFn,
  updateCollectionFn,
  createCollectionFn,
  publishCollectionFn,
  unpublishCollectionFn,
  duplicateCollectionFn,
} from '../../../server/collections'
import { getProductsFn } from '../../../server/products'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { cn } from '../../../lib/utils'

type LocalizedString = { en: string; fr?: string; id?: string }

interface Product {
  id: string
  handle: string
  name: string | LocalizedString
  image: string | null
}

interface Collection {
  id: string
  handle: string
  name: LocalizedString
  description?: LocalizedString
  imageUrl?: string
  metaTitle?: LocalizedString
  metaDescription?: LocalizedString
  publishedAt: string | Date | null
  createdAt: string | Date
  products?: Product[]
}

interface CollectionFormProps {
  collection?: Collection
  isEdit?: boolean
}

function SortableProductItem({
  product,
  onRemove,
}: {
  product: Product
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-4 p-4 border border-border/50 rounded-2xl bg-background/50 hover:bg-background hover:border-pink-200 transition-all duration-300',
        isDragging &&
          'shadow-2xl border-pink-400 bg-background scale-[1.02] opacity-90',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground/40 group-hover:text-pink-500 transition-colors" />
      </div>

      <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/50 shrink-0">
        {product.image ? (
          <img
            src={product.image}
            className="h-full w-full object-cover"
            alt=""
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">
          {typeof product.name === 'string' ? product.name : product.name?.en}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          /{product.handle}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(product.id)}
        className="h-10 w-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function CollectionForm({
  collection,
  isEdit = false,
}: CollectionFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [localProducts, setLocalProducts] = useState<Product[]>([])

  useEffect(() => {
    if (collection?.products) {
      setLocalProducts(collection.products)
    }
  }, [collection])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const name: LocalizedString = { en: values.nameEn }
      if (values.nameFr) name.fr = values.nameFr
      if (values.nameId) name.id = values.nameId

      const description: LocalizedString = { en: values.descriptionEn }
      if (values.descriptionFr) description.fr = values.descriptionFr
      if (values.descriptionId) description.id = values.descriptionId

      const metaTitle: LocalizedString = { en: values.metaTitleEn }
      if (values.metaTitleFr) metaTitle.fr = values.metaTitleFr
      if (values.metaTitleId) metaTitle.id = values.metaTitleId

      const metaDescription: LocalizedString = { en: values.metaDescriptionEn }
      if (values.metaDescriptionFr)
        metaDescription.fr = values.metaDescriptionFr
      if (values.metaDescriptionId)
        metaDescription.id = values.metaDescriptionId

      const payload = {
        name,
        handle: values.handle,
        description: values.descriptionEn ? description : undefined,
        imageUrl: values.imageUrl || undefined,
        metaTitle: values.metaTitleEn ? metaTitle : undefined,
        metaDescription: values.metaDescriptionEn ? metaDescription : undefined,
      }

      if (isEdit && collection) {
        return updateCollectionFn({ data: { id: collection.id, ...payload } })
      } else {
        return createCollectionFn({ data: payload })
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      if (isEdit) {
        queryClient.invalidateQueries({
          queryKey: ['collection', collection?.id],
        })
        toast.success(t('Collection updated'))
      } else {
        toast.success(t('Collection created'))
        navigate({
          to: '/admin/collections/$collectionId',
          params: { collectionId: result.data.id },
        })
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const form = useForm({
    defaultValues: {
      nameEn: collection?.name?.en || '',
      nameFr: collection?.name?.fr || '',
      nameId: collection?.name?.id || '',
      handle: collection?.handle || '',
      descriptionEn: collection?.description?.en || '',
      descriptionFr: collection?.description?.fr || '',
      descriptionId: collection?.description?.id || '',
      imageUrl: collection?.imageUrl || '',
      metaTitleEn: collection?.metaTitle?.en || '',
      metaTitleFr: collection?.metaTitle?.fr || '',
      metaTitleId: collection?.metaTitle?.id || '',
      metaDescriptionEn: collection?.metaDescription?.en || '',
      metaDescriptionFr: collection?.metaDescription?.fr || '',
      metaDescriptionId: collection?.metaDescription?.id || '',
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value)
    },
  })

  // Queries
  const { data: allProductsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProductsFn(),
    enabled: isPickerOpen,
  })

  const allProducts = useMemo(
    () => (allProductsData?.data || []) as Product[],
    [allProductsData],
  )

  const addProductsMutation = useMutation({
    mutationFn: (ids: string[]) => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return addProductsToCollectionFn({
        data: { collectionId: collection.id, productIds: ids },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collection?.id],
      })
      setIsPickerOpen(false)
      setSelectedIds([])
      toast.success(t('Products added'))
    },
  })

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return removeProductFromCollectionFn({
        data: { collectionId: collection.id, productId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collection?.id],
      })
      toast.success(t('Product removed'))
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return reorderCollectionProductsFn({
        data: { collectionId: collection.id, productIds: ids },
      })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['collection', collection?.id],
      }),
  })

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return publishCollectionFn({ data: { id: collection.id } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collection?.id],
      })
      toast.success(t('Collection published'))
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return unpublishCollectionFn({ data: { id: collection.id } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collection?.id],
      })
      toast.success(t('Collection unpublished'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!collection?.id) throw new Error('Collection ID is missing')
      return duplicateCollectionFn({ data: { id: collection.id } })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success(t('Collection duplicated'))
      navigate({
        to: '/admin/collections/$collectionId',
        params: { collectionId: result.data.id },
      })
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalProducts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newArray = arrayMove(items, oldIndex, newIndex)
        reorderMutation.mutate(newArray.map((p) => p.id))
        return newArray
      })
    }
  }

  const handleNameChange = (val: string) => {
    form.setFieldValue('nameEn', val)
    if (
      !isEdit &&
      (!form.getFieldValue('handle') ||
        form.getFieldValue('handle') ===
          generateHandle(form.getFieldValue('nameEn')))
    ) {
      form.setFieldValue('handle', generateHandle(val))
    }
    // Sync SEO Title if not manually set
    if (
      !form.getFieldValue('metaTitleEn') ||
      form.getFieldValue('metaTitleEn') === form.getFieldValue('nameEn')
    ) {
      form.setFieldValue('metaTitleEn', val)
    }
  }

  const existingIds = useMemo(
    () => new Set(localProducts.map((p) => p.id)),
    [localProducts],
  )

  const filteredAvailable = useMemo(() => {
    return allProducts.filter((p) => {
      const name = typeof p.name === 'string' ? p.name : p.name?.en || ''
      return (
        !existingIds.has(p.id) &&
        name.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [allProducts, existingIds, search])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            asChild
          >
            <Link to="/admin/collections">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {isEdit ? collection?.name?.en : t('New Collection')}
            </h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="px-2 py-0 border-pink-200 text-pink-700 bg-pink-50/50"
              >
                {isEdit ? t('Editing') : t('Creating')}
              </Badge>
              {isEdit && (
                <span className="text-xs text-muted-foreground font-medium">
                  ID: {collection?.id}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-4"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending
                ? t('Duplicating...')
                : t('Duplicate')}
            </Button>
          )}
          <Button variant="ghost" asChild className="rounded-xl px-6">
            <Link to="/admin/collections">{t('Cancel')}</Link>
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-xl px-8 bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 text-white font-bold transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {saveMutation.isPending
              ? t('Saving...')
              : isEdit
                ? t('Save Changes')
                : t('Create Collection')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-pink-500" />
                {t('Collection Details')}
              </CardTitle>
              <CardDescription>
                {t('Configure the identity of this collection')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid gap-6">
                <form.Field name="nameEn">
                  {(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor={field.name}
                        className="font-bold text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        {t('Name')} (English) *
                      </Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        placeholder={t('Enter collection name...')}
                        className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="descriptionEn">
                  {(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor={field.name}
                        className="font-bold text-xs uppercase tracking-widest text-muted-foreground"
                      >
                        {t('Description')} (English)
                      </Label>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        rows={4}
                        className="rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-none p-4"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </CardContent>
          </Card>

          {/* Products Management */}
          {isEdit && (
            <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <PackageIcon className="h-5 w-5 text-rose-500" />
                    {t('Products')}
                  </CardTitle>
                  <CardDescription>
                    {t('Manage items in this collection (Drag to reorder)')}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsPickerOpen(true)}
                  className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold px-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('Add Products')}
                </Button>
              </CardHeader>
              <CardContent>
                {localProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
                    <PackageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium mb-4">
                      {t('No products in this collection yet')}
                    </p>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50"
                    >
                      {t('Start adding products')}
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localProducts.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {localProducts.map((product) => (
                          <SortableProductItem
                            key={product.id}
                            product={product}
                            onRemove={(id) => removeProductMutation.mutate(id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search Engine Listing */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                {t('Search Engine Listing')}
              </CardTitle>
              <CardDescription>
                {t('Preview how this collection appears in search results')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* SEO Preview */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-sm max-w-2xl">
                <p className="text-[#1a0dab] text-xl font-medium hover:underline cursor-pointer truncate">
                  {form.getFieldValue('metaTitleEn') ||
                    form.getFieldValue('nameEn') ||
                    t('Collection Title')}
                </p>
                <p className="text-[#006621] text-sm truncate">
                  {window.location.origin}/collections/
                  {form.getFieldValue('handle') || 'handle'}
                </p>
                <p className="text-[#545454] text-sm line-clamp-2">
                  {form.getFieldValue('metaDescriptionEn') ||
                    form.getFieldValue('descriptionEn') ||
                    t(
                      'Add a description to see how this collection might appear in search engine listings.',
                    )}
                </p>
              </div>

              <div className="grid gap-6">
                <form.Field name="metaTitleEn">
                  {(field) => (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          {t('Page Title')}
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          {field.state.value.length} / 70 {t('characters')}
                        </span>
                      </div>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={form.getFieldValue('nameEn')}
                        className="rounded-xl bg-background/50 border-border/50"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="metaDescriptionEn">
                  {(field) => (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          {t('Meta Description')}
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          {field.state.value.length} / 160 {t('characters')}
                        </span>
                      </div>
                      <Textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={form.getFieldValue('descriptionEn')}
                        rows={3}
                        className="rounded-xl bg-background/50 border-border/50 resize-none"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="handle">
                  {(field) => (
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        {t('URL and handle')}
                      </Label>
                      <div className="flex items-center group">
                        <div className="h-11 px-3 flex items-center bg-muted/50 text-muted-foreground text-sm font-medium border border-r-0 border-border/50 rounded-l-xl">
                          /collections/
                        </div>
                        <Input
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="h-11 rounded-none rounded-r-xl bg-background/50 border-border/50 font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Status/Visibility */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-pink-500" />
                {t('Status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">{t('Published')}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {collection?.publishedAt
                      ? t('Visible on storefront')
                      : t('Not visible')}
                  </p>
                </div>
                {isEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant={collection?.publishedAt ? 'outline' : 'default'}
                    className={cn(
                      'rounded-lg font-bold text-xs h-8',
                      !collection?.publishedAt &&
                        'bg-pink-500 hover:bg-pink-600 text-white',
                    )}
                    onClick={() => {
                      if (collection?.publishedAt) {
                        unpublishMutation.mutate()
                      } else {
                        publishMutation.mutate()
                      }
                    }}
                    disabled={
                      publishMutation.isPending || unpublishMutation.isPending
                    }
                  >
                    {collection?.publishedAt ? t('Unpublish') : t('Publish')}
                  </Button>
                )}
                {!isEdit && <Badge variant="secondary">{t('Draft')}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-pink-500" />
                {t('Collection Image')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form.Subscribe selector={(state) => state.values.imageUrl}>
                {(imageUrl) => (
                  <div className="aspect-[16/9] w-full rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 overflow-hidden flex items-center justify-center group relative">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt=""
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => form.setFieldValue('imageUrl', '')}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('Remove')}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">
                          {t('No image URL provided')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form.Subscribe>
              <form.Field name="imageUrl">
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="font-bold text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      {t('Image URL')}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="url"
                      placeholder="https://..."
                      className="rounded-xl bg-background/50 border-border/50 focus:border-pink-500"
                    />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>

          {isEdit && collection && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                    {t('Products')}
                  </span>
                  <span className="font-bold tabular-nums">
                    {localProducts.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                    {t('Created At')}
                  </span>
                  <span className="font-bold">
                    {new Date(collection.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Product Picker Dialog */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl rounded-3xl">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-black">
              {t('Add Products')}
            </DialogTitle>
            <DialogDescription>
              {t('Select products to include in this collection')}
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 mb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-pink-500" />
              <Input
                placeholder={t('Search products...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/50 focus:ring-pink-500/10 focus:border-pink-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 space-y-3 pb-8">
            {filteredAvailable.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Search className="h-10 w-10 mb-2" />
                <p className="font-bold tracking-tight">
                  {t('No results found')}
                </p>
              </div>
            ) : (
              filteredAvailable.map((product) => (
                <div
                  key={product.id}
                  onClick={() => toggleSelect(product.id)}
                  className={`
                    group flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all duration-300
                    ${
                      selectedIds.includes(product.id)
                        ? 'bg-pink-500/10 border-pink-500 shadow-sm'
                        : 'bg-background/20 border-border/50 hover:bg-background/50'
                    }
                  `}
                >
                  <div
                    className={`
                    h-5 w-5 rounded-md border flex items-center justify-center transition-all duration-300
                    ${selectedIds.includes(product.id) ? 'bg-pink-500 border-pink-500 text-white' : 'border-border group-hover:border-pink-400'}
                  `}
                  >
                    {selectedIds.includes(product.id) && (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    )}
                  </div>

                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted/50">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm tracking-tight truncate">
                      {typeof product.name === 'string'
                        ? product.name
                        : product.name?.en}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      /{product.handle}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="p-8 pt-4 border-t border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="rounded-xl px-6"
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              disabled={
                selectedIds.length === 0 || addProductsMutation.isPending
              }
              onClick={() => addProductsMutation.mutate(selectedIds)}
              className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black px-8 shadow-lg shadow-pink-500/20"
            >
              {addProductsMutation.isPending
                ? t('Adding...')
                : t('Add Selected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface PackageIconProps {
  className?: string
}

function PackageIcon({ className }: PackageIconProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M12 22V12" />
      <path d="M3 7l9 5 9-5" />
    </svg>
  )
}
