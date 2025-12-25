import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ProductCard } from '../../../components/products/ProductCard'
import { getProducts } from '../../../data/products'

export const Route = createFileRoute('/$lang/products/')({
  loader: () => getProducts(),
  head: ({ params }) => {
    const titles: Record<string, string> = {
      en: 'All Products | Obelisk',
      fr: 'Tous les produits | Obelisk',
      id: 'Semua Produk | Obelisk',
    }
    return {
      meta: [{ title: titles[params.lang] || titles.en }],
    }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const { t } = useTranslation()
  const products = Route.useLoaderData()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          {t('All Products')}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {t(
            'Explore our curated collection of minimalist essentials, designed for the modern obelisk.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
