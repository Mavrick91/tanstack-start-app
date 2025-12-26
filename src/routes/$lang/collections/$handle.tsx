import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { CollectionSort } from '../../../components/collections/CollectionSort'
import { ProductCard } from '../../../components/products/ProductCard'
import { getCollectionByHandle } from '../../../data/storefront'

const collectionSearchSchema = z.object({
  sort: z.string().optional(),
})

export const Route = createFileRoute('/$lang/collections/$handle')({
  validateSearch: collectionSearchSchema,
  loaderDeps: ({ search }) => ({ sort: search.sort }),
  loader: ({ params, deps }) =>
    getCollectionByHandle({
      data: {
        handle: params.handle,
        lang: params.lang,
        sort: deps.sort,
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
  const { sort } = Route.useSearch()
  const { t } = useTranslation()

  if (!collection) return null

  return (
    <div className="bg-background h-[calc(100vh-var(--header-height,64px))] flex flex-col overflow-hidden">
      {/* Fixed Header Area */}
      <div className="flex-none">
        {/* Hero Section */}
        <div className="relative border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4 md:py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]">
                    {collection.products.length} {t('Products')}
                  </span>
                </div>
              </div>

              {collection.imageUrl && (
                <div className="hidden md:block relative aspect-[21/9] rounded-xl overflow-hidden shadow-xl ring-1 ring-border">
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

        {/* Toolbar */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2">
          <div className="container mx-auto">
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
        </div>
      </div>

      {/* Scrollable Product Grid Area */}
      <div className="flex-1 overflow-y-auto min-h-0 container mx-auto px-4 py-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {collection.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
