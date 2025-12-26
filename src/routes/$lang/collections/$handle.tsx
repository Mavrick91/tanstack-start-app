import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { CollectionSort } from '../../../components/collections/CollectionSort'
import { ProductCard } from '../../../components/products/ProductCard'
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs'
import { getCollectionByHandle } from '../../../data/storefront'

const collectionSearchSchema = z.object({
  sort: z.string().optional(),
})

export const Route = createFileRoute('/$lang/collections/$handle')({
  validateSearch: collectionSearchSchema,
  loader: ({ params, ...rest }) =>
    getCollectionByHandle({
      data: {
        handle: params.handle,
        lang: params.lang,
        sort: (rest as any).search?.sort,
      },
    }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.name} | FineNail Season`
          : 'Collection | FineNail Season',
      },
      {
        name: 'description',
        content: loaderData?.description || 'Browse our collection',
      },
    ],
  }),
  component: CollectionPage,
})

function CollectionPage() {
  const collection = Route.useLoaderData()
  const { lang } = Route.useParams()
  const { sort } = Route.useSearch()
  const { t } = useTranslation()

  if (!collection) return null

  const breadcrumbItems = [
    { label: t('Collections'), to: '/$lang/collections', params: { lang } },
    { label: collection.name },
  ]

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="relative border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <Breadcrumbs items={breadcrumbItems} lang={lang} className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider text-[10px]">
                  {collection.products.length} {t('Products')}
                </span>
              </div>
            </div>

            {collection.imageUrl && (
              <div className="hidden md:block relative aspect-[16/6] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border">
                <img
                  src={collection.imageUrl}
                  alt={collection.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="sticky top-[var(--header-height,64px)] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-12 -mx-4 px-4 py-4 sm:-mx-0 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {t('All Products')}
              <span className="text-muted-foreground font-normal text-sm">
                ({collection.products.length})
              </span>
            </h2>

            <CollectionSort currentSort={sort || collection.sortOrder} />
          </div>
        </div>

        {/* Product Grid */}
        {collection.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl text-muted-foreground">📭</span>
            </div>
            <p className="text-xl font-medium text-muted-foreground">
              {t('No products in this collection')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {collection.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
