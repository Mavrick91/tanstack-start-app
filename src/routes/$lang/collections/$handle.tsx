import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackButton } from '../../../components/ui/back-button'
import { ProductCard } from '../../../components/products/ProductCard'
import { getCollectionByHandle } from '../../../data/storefront'

export const Route = createFileRoute('/$lang/collections/$handle')({
  loader: ({ params }) =>
    getCollectionByHandle({
      data: { handle: params.handle, lang: params.lang },
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
  const { t } = useTranslation()

  if (!collection) return null

  return (
    <div className="container mx-auto px-4 py-16">
      <BackButton
        to="/$lang/products"
        params={{ lang }}
        label={t('Back to all products')}
        className="mb-12"
      />

      {/* Collection Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
        <div className="space-y-4">
          <div className="aspect-[16/9] md:aspect-[4/5] rounded-3xl overflow-hidden bg-secondary/30 shadow-2xl shadow-black/5">
            {collection.imageUrl ? (
              <img
                src={collection.imageUrl}
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                <span className="text-muted-foreground font-medium">
                  {t('No image available')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              {collection.name}
            </h1>
            <div className="h-1 w-20 bg-primary rounded-full" />
          </div>

          {collection.description && (
            <p className="text-muted-foreground text-lg leading-relaxed">
              {collection.description}
            </p>
          )}

          <div className="pt-4">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t('Collection Stats')}
            </p>
            <p className="text-2xl font-medium">
              {collection.products.length} {t('Products')}
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-12">
        <div className="flex items-center justify-between border-b border-border/50 pb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            {t('Shop the Collection')}
          </h2>
        </div>

        {collection.products.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <p className="text-muted-foreground">
              {t('No products in this collection')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {collection.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
