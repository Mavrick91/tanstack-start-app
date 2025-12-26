import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Globe, LayoutGrid, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ProductPickerDialog } from './components/ProductPickerDialog'
import { ProductsCard } from './components/ProductsCard'
import { useCollectionForm } from './hooks/useCollectionForm'
import { useCollectionMutations } from './hooks/useCollectionMutations'
import { useProductPicker } from './hooks/useProductPicker'
import { cn } from '../../../lib/utils'
import { getProductsFn } from '../../../server/products'
import { CollectionThumbnail } from '../../collections/CollectionThumbnail'
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
import { Textarea } from '../../ui/textarea'

import type { CollectionFormProps, Product } from './types'

export function CollectionForm({
  collection,
  isEdit = false,
}: CollectionFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Local state for products (optimistic updates + UI source of truth)
  const [localProducts, setLocalProducts] = useState<Product[]>(
    () => collection?.products ?? [],
  )

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProductsFn().then((res) => res.data),
    enabled: true,
  })

  const picker = useProductPicker({ localProducts, allProducts })

  const mutations = useCollectionMutations({
    collection,
    isEdit,
    allProducts,
    onProductsAdded: (newProducts) => {
      setLocalProducts((prev) => [...prev, ...newProducts])
    },
    onProductRemoved: (id) => {
      setLocalProducts((prev) => prev.filter((p) => p.id !== id))
    },

    onPickerClose: picker.close,
    onSelectionReset: picker.resetSelection,
  })

  const { form, handleNameChange } = useCollectionForm({
    collection,
    isEdit,
    onSubmit: mutations.save.mutate,
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/admin/collections' })}
            className="rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                {isEdit ? (
                  typeof collection?.name === 'string' ? (
                    collection.name
                  ) : (
                    collection?.name?.en
                  )
                ) : (
                  <span className="text-muted-foreground">
                    {t('New Collection')}
                  </span>
                )}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'uppercase tracking-widest text-[10px] py-0.5 px-2 rounded-lg font-bold border-border',
                  isEdit
                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
                )}
              >
                {isEdit ? t('Editing') : t('Creating')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-medium">
              {isEdit
                ? t('Manage your collection details and products')
                : t('Create a new collection to organize your products')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/collections">
            <Button variant="outline" className="rounded-xl border-border/50">
              {t('Cancel')}
            </Button>
          </Link>
          <Button
            onClick={form.handleSubmit}
            disabled={mutations.save.isPending}
            className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black px-6 shadow-lg shadow-pink-500/20"
          >
            {isEdit ? t('Save Changes') : t('Create Collection')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Collection Details */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-pink-500" />
                {t('Collection Details')}
              </CardTitle>
              <CardDescription>
                {t('Basic information about the collection')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form.Field
                name="nameEn"
                validators={{
                  onChange: ({ value }) =>
                    !value ? t('Name is required') : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="nameEn"
                      className="text-foreground/80 font-bold"
                    >
                      {t('Name')} <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      id="nameEn"
                      placeholder={t('Enter collection name...')}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        handleNameChange(e.target.value)
                      }}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 font-medium"
                    />
                    {field.state.meta.errors ? (
                      <p className="text-sm text-destructive font-medium">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="handle">
                  {(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor="handle"
                        className="text-foreground/80 font-bold"
                      >
                        {t('Handle')}
                      </Label>
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
                    </div>
                  )}
                </form.Field>

                <form.Field name="imageUrl">
                  {(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor="imageUrl"
                        className="text-foreground/80 font-bold flex items-center justify-between"
                      >
                        {t('Image URL')}
                        {/* Preview of what will be shown if no URL is provided */}
                        <div className="w-8 h-8 rounded overflow-hidden border border-border/50">
                          {field.state.value ? (
                            <img
                              src={field.state.value}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CollectionThumbnail
                              images={localProducts.map((p) => p.image)}
                            />
                          )}
                        </div>
                      </Label>
                      <Input
                        id="imageUrl"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="https://..."
                        className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 font-mono text-sm"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="descriptionEn">
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="descriptionEn"
                      className="text-foreground/80 font-bold"
                    >
                      {t('Description')}
                    </Label>
                    <Textarea
                      id="descriptionEn"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="min-h-[120px] rounded-xl bg-background/50 border-border/50 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
                      placeholder={t('Describe this collection...')}
                    />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>

          {/* Products Management - Only show in Edit Mode */}
          {isEdit && (
            <ProductsCard
              products={localProducts}
              onAddClick={() => picker.setIsOpen(true)}
              onRemove={(id) => mutations.removeProduct.mutate(id)}
              onReorder={(newProducts) => {
                setLocalProducts(newProducts)
                mutations.reorder.mutate(newProducts.map((p) => p.id))
              }}
            />
          )}

          {/* SEO Settings */}
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                {t('Search Engine Listing')}
              </CardTitle>
              <CardDescription>
                {t('Edit how this collection appears on search engines')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form.Subscribe
                selector={(state) => [
                  state.values.metaTitleEn,
                  state.values.nameEn,
                  state.values.handle,
                  state.values.metaDescriptionEn,
                  state.values.descriptionEn,
                ]}
              >
                {([
                  metaTitleEn,
                  nameEn,
                  handle,
                  metaDescriptionEn,
                  descriptionEn,
                ]) => (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                    <h4 className="text-blue-600 dark:text-blue-400 text-lg font-medium hover:underline cursor-pointer truncate">
                      {(metaTitleEn as string) ||
                        (nameEn as string) ||
                        t('Collection Title')}
                    </h4>
                    <p className="text-emerald-700 dark:text-emerald-400 text-sm truncate">
                      {window.location.origin}/collections/
                      {handle as string}
                    </p>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {(metaDescriptionEn as string) ||
                        (descriptionEn as string) ||
                        t(
                          'Add a description to see how this collection might appear in search engine listings.',
                        )}
                    </p>
                  </div>
                )}
              </form.Subscribe>

              <form.Field name="metaTitleEn">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="metaTitleEn"
                        className="text-foreground/80 font-bold"
                      >
                        {t('Meta Title')}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {(field.state.value || '').length} / 70{' '}
                        {t('characters')}
                      </span>
                    </div>
                    <Input
                      id="metaTitleEn"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="metaDescriptionEn">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="metaDescriptionEn"
                        className="text-foreground/80 font-bold"
                      >
                        {t('Meta Description')}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {(field.state.value || '').length} / 160{' '}
                        {t('characters')}
                      </span>
                    </div>
                    <Textarea
                      id="metaDescriptionEn"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="min-h-[100px] rounded-xl bg-background/50 border-border/50 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-sm overflow-hidden sticky top-8">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-emerald-500" />
                {t('Status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                <span className="font-medium text-sm text-muted-foreground">
                  {t('Visibility')}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      collection?.publishedAt
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
                    )}
                  />
                  <span
                    className={cn(
                      'font-bold text-sm',
                      collection?.publishedAt
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {collection?.publishedAt
                      ? t('Visible on storefront')
                      : t('Not visible')}
                  </span>
                </div>
              </div>

              {collection?.publishedAt && (
                <div className="text-xs text-muted-foreground text-center font-medium">
                  {t('Published on')}{' '}
                  {new Date(collection.publishedAt).toLocaleDateString()}
                </div>
              )}

              {isEdit && (
                <div className="space-y-3 pt-6 border-t border-border/50">
                  {collection?.publishedAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mutations.unpublish.mutate()}
                      className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t('Unpublish')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mutations.publish.mutate()}
                      className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t('Publish')}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => mutations.duplicate.mutate()}
                    className="w-full justify-start"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('Duplicate')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductPickerDialog
        isOpen={picker.isOpen}
        onOpenChange={picker.setIsOpen}
        products={picker.filteredProducts}
        selectedIds={picker.selectedIds}
        onToggleSelect={picker.toggleSelect}
        search={picker.search}
        onSearchChange={picker.setSearch}
        onAdd={() => mutations.addProducts.mutate(picker.selectedIds)}
        onCancel={picker.close}
        isAdding={mutations.addProducts.isPending}
      />
    </div>
  )
}
