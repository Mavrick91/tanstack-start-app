import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MoreHorizontal, Package, Plus } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'

type Product = {
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

export const Route = createFileRoute('/admin/products/')({
  component: AdminProductsPage,
})

function AdminProductsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products', { credentials: 'include' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.products as Product[]
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500" />
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

  const products = data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link to="/admin/products/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first product
          </p>
          <Link to="/admin/products/new">
            <Button>Add Product</Button>
          </Link>
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
                  Inventory
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
                    <Link
                      to="/admin/products/$productId"
                      params={{ productId: product.id }}
                      className="font-medium hover:text-pink-500 transition-colors"
                    >
                      {product.name.en}
                    </Link>
                    {product.vendor && (
                      <p className="text-sm text-muted-foreground">
                        {product.vendor}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        product.totalInventory === 0 ? 'text-red-500' : ''
                      }
                    >
                      {product.totalInventory} in stock
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.minPrice !== null ? (
                      product.minPrice === product.maxPrice ? (
                        <span>${product.minPrice.toFixed(2)}</span>
                      ) : (
                        <span>
                          ${product.minPrice.toFixed(2)} - $
                          {product.maxPrice?.toFixed(2)}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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

function StatusBadge({ status }: { status: 'draft' | 'active' | 'archived' }) {
  const variants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    active: 'default',
    draft: 'secondary',
    archived: 'outline',
  }

  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  )
}
