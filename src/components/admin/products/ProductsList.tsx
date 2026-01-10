import { useQuery } from '@tanstack/react-query'
import { MoreHorizontal, Package, Plus } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { formatCurrency } from '../../../lib/format'
import { getAdminProductsFn } from '../../../server/products'
import { AdminStatusBadge } from '../components/AdminStatusBadge'

export type Product = {
  id: string
  handle: string
  name: { en: string; fr?: string; id?: string }
  status: 'draft' | 'active' | 'archived'
  vendor: string | null
  productType: string | null
  variantCount: number
  minPrice: number | null
  maxPrice: number | null
  totalInventory: number
  createdAt: string
}

type PriceDisplayProps = {
  minPrice: number | null
  maxPrice: number | null
}

const PriceDisplay = ({ minPrice, maxPrice }: PriceDisplayProps) => {
  if (minPrice === null) {
    return <span className="text-muted-foreground">-</span>
  }

  if (minPrice === maxPrice) {
    return <span>{formatCurrency({ value: minPrice })}</span>
  }

  return (
    <span>
      {formatCurrency({ value: minPrice })} -{' '}
      {formatCurrency({ value: maxPrice })}
    </span>
  )
}

/**
 * Extracted component for testing (without route wrapper)
 */
export const ProductsListContent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => getAdminProductsFn(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load products</p>
      </div>
    )
  }

  const products = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <a href="/admin/products/new" role="link">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </a>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first product
          </p>
          <a href="/admin/products/new">
            <Button>Add Product</Button>
          </a>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Product
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Price
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  Variants
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <a
                      href={`/admin/products/${product.id}`}
                      className="font-medium hover:text-pink-500 transition-colors"
                    >
                      {product.name.en}
                    </a>
                    {product.vendor && (
                      <p className="text-sm text-muted-foreground">
                        {product.vendor}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <AdminStatusBadge status={product.status} />
                  </td>
                  <td className="px-6 py-4">
                    <PriceDisplay
                      minPrice={product.minPrice}
                      maxPrice={product.maxPrice}
                    />
                  </td>
                  <td className="px-6 py-4">
                    {product.variantCount}{' '}
                    {product.variantCount === 1 ? 'variant' : 'variants'}
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
