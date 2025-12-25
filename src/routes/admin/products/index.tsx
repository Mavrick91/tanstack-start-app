import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Package, Plus, Search, Filter, ArrowRight } from 'lucide-react'

import { ProductActionsDropdown } from '../../../components/admin/products/ProductActionsDropdown'
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-pink-500/20 border-t-pink-500" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Collection...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 bg-card rounded-3xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-1">
          Failed to load catalog
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          Please check your connection or try logging in again.
        </p>
      </div>
    )
  }

  const products = data || []

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-muted-foreground font-medium text-sm">
            Manage your product catalog and inventory
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm font-semibold gap-2 transition-all">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex gap-4 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            placeholder="Search products, handles or vendors..."
            className="w-full h-11 pl-11 pr-4 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/10 transition-all font-medium text-sm shadow-sm"
          />
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-xl border-border bg-background gap-2 font-semibold px-5 shadow-sm"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          Filters
        </Button>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-pink-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-pink-500/40" />
          </div>
          <h3 className="text-xl font-bold mb-1">Catalog is empty</h3>
          <p className="text-muted-foreground text-xs font-medium mb-6 max-w-xs mx-auto">
            Your products will appear here once you&apos;ve added them to the
            stable.
          </p>
          <Link to="/admin/products/new">
            <Button
              variant="outline"
              className="rounded-xl h-10 px-6 font-semibold"
            >
              Create First Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Product
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Status
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Inventory
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Price
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Details
                  </th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-muted/20 transition-all duration-200 group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        {/* Subtle Initial Icon */}
                        <div className="w-10 h-10 rounded-xl bg-pink-500/5 flex items-center justify-center text-pink-500 font-bold text-sm shrink-0 border border-pink-500/10 group-hover:scale-105 transition-transform duration-300">
                          {product.name.en.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to="/admin/products/$productId"
                            params={{ productId: product.id }}
                            className="text-sm font-semibold truncate hover:text-pink-500 transition-colors flex items-center gap-2 group/link"
                          >
                            {product.name.en}
                            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-pink-500" />
                          </Link>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                            {product.vendor || 'FineNail Edition'} •{' '}
                            {product.handle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${product.totalInventory === 0 ? 'bg-destructive' : 'bg-pink-500'}`}
                            style={{
                              width: `${Math.min(product.totalInventory, 100)}%`,
                            }}
                          />
                        </div>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${product.totalInventory === 0 ? 'text-destructive' : 'text-foreground/70'}`}
                        >
                          {product.totalInventory}{' '}
                          {product.totalInventory === 1 ? 'unit' : 'units'}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {product.minPrice !== null ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            ${product.minPrice.toFixed(2)}
                            {product.minPrice !== product.maxPrice && (
                              <span className="text-muted-foreground/60 font-medium">
                                {' '}
                                - ${product.maxPrice?.toFixed(2)}
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-muted/50 rounded-lg border border-border/50">
                        <span className="text-[10px] font-bold">
                          {product.variantCount}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-tight">
                          {product.variantCount === 1 ? 'Variant' : 'Variants'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <ProductActionsDropdown
                        productId={product.id}
                        productName={product.name.en}
                        status={product.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'active' | 'archived' }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    active: {
      bg: 'bg-emerald-500/5 border-emerald-500/10',
      text: 'text-emerald-600',
      dot: 'bg-emerald-500',
    },
    draft: {
      bg: 'bg-amber-500/5 border-amber-500/10',
      text: 'text-amber-600',
      dot: 'bg-amber-500',
    },
    archived: {
      bg: 'bg-muted/50 border-border',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
  }

  const current = styles[status] || styles.draft

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${current.bg} border`}
    >
      <div className={`w-1 h-1 rounded-full ${current.dot}`} />
      <span className="text-[9px] font-bold uppercase tracking-wider">
        {status}
      </span>
    </div>
  )
}
