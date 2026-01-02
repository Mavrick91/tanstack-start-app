import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductListActions } from './ProductListActions'
import { formatCurrency } from '../../../../lib/format'
import { Checkbox } from '../../../ui/checkbox'
import { AdminStatusBadge } from '../../components/AdminStatusBadge'
import { SortableHeader } from '../../components/SortableHeader'

import type { SortKey, SortOrder } from '../hooks/useProductFilters'
import type { Product } from '../types'

interface ProductTableProps {
  products: Product[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  isAllSelected: boolean
  isSomeSelected: boolean
  sortKey: SortKey
  sortOrder: SortOrder
  onSort: (key: SortKey) => void
}

export const ProductTable = ({
  products,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  isSomeSelected,
  sortKey,
  sortOrder,
  onSort,
}: ProductTableProps) => {
  const { t } = useTranslation()

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {/* Checkbox column */}
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={
                    isAllSelected || (isSomeSelected ? 'indeterminate' : false)
                  }
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all products"
                />
              </th>
              <SortableHeader
                label={t('Product')}
                sortKey="name"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Status')}
                sortKey="status"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Price')}
                sortKey="price"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {t('SKU')}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {products.map((product) => (
              <tr
                key={product.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors group ${selectedIds.has(product.id) ? 'bg-pink-500/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => onToggleSelect(product.id)}
                    aria-label={`Select ${product.name.en}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.firstImageUrl ? (
                      <img
                        src={product.firstImageUrl}
                        alt={product.name.en}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border/50 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-pink-500/5 flex items-center justify-center text-pink-500 font-bold text-sm shrink-0 border border-pink-500/10">
                        {product.name.en.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        to="/admin/products/$productId"
                        params={{ productId: product.id }}
                        className="text-sm font-semibold truncate hover:text-pink-500 transition-colors flex items-center gap-1.5 group/link"
                      >
                        {product.name.en}
                        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-pink-500" />
                      </Link>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                        {product.vendor || 'FineNail'} • {product.handle}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge status={product.status} variant="product" />
                </td>
                <td className="px-4 py-3">
                  <PriceDisplay
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {product.sku || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ProductListActions
                    productId={product.id}
                    productName={product.name.en}
                    handle={product.handle}
                    status={product.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PriceDisplay = ({
  price,
  compareAtPrice,
}: {
  price: string | null
  compareAtPrice: string | null
}) => {
  if (price === null) {
    return <span className="text-muted-foreground text-xs font-medium">—</span>
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold">
        {formatCurrency({ value: price })}
      </span>
      {compareAtPrice && (
        <span className="text-[10px] text-muted-foreground line-through">
          {formatCurrency({ value: compareAtPrice })}
        </span>
      )}
    </div>
  )
}

export const ProductTableSkeleton = () => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="w-12 px-4 py-3">
                <div className="w-4 h-4 bg-muted rounded" />
              </th>
              {['Product', 'Status', 'Price', 'SKU', ''].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-3">
                  <div className="w-4 h-4 bg-muted rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="h-2 w-20 bg-muted rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-1 w-14 bg-muted rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-12 bg-muted rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-3 w-16 bg-muted rounded" />
                </td>
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
