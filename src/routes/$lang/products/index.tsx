import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ProductCard } from '../../../components/products/ProductCard'
import { getProducts } from '../../../data/storefront'

const ProductsPage = () => {
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
            'Explore our complete collection of nail art essentials, from polishes to tools.',
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

export const Route = createFileRoute('/$lang/products/')({
  loader: ({ params }) => getProducts({ data: { lang: params.lang } }),
  head: ({ params }) => {
    const titles: Record<string, string> = {
      en: 'All Products | FineNail Season',
      fr: 'Tous les produits | FineNail Season',
      id: 'Semua Produk | FineNail Season',
    }
    return {
      meta: [{ title: titles[params.lang] || titles.en }],
    }
  },
  component: ProductsPage,
})
