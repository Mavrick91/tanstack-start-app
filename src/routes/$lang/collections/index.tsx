import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CollectionCard } from '../../../components/collections/CollectionCard'
import { getCollections } from '../../../data/storefront'

export const Route = createFileRoute('/$lang/collections/')({
  loader: ({ params }) => getCollections({ data: { lang: params.lang } }),
  head: ({ params }) => {
    const titles: Record<string, string> = {
      en: 'All Collections | FineNail Season',
      fr: 'Toutes les collections | FineNail Season',
      id: 'Semua Koleksi | FineNail Season',
    }
    return {
      meta: [{ title: titles[params.lang] || titles.en }],
    }
  },
  component: CollectionsPage,
})

function CollectionsPage() {
  const { t } = useTranslation()
  const collections = Route.useLoaderData()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          {t('All Collections')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {t('Explore our curated themes and seasonal edits.')}
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="py-20 text-center space-y-4 border rounded-3xl bg-muted/10">
          <p className="text-muted-foreground font-medium">
            {t('No collections found.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  )
}
