import { createFileRoute } from '@tanstack/react-router'
import { getProducts } from '../../data/products'
import { ProductCard } from '../../components/products/ProductCard'

export const Route = createFileRoute('/products/')({
  loader: () => getProducts(),
  component: ProductsPage,
})

function ProductsPage() {
  const products = Route.useLoaderData()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            All Products
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Explore our curated collection of minimalist essentials, designed
            for the modern obelisk.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
