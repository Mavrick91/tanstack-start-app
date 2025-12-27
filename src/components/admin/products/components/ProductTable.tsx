import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductListActions } from './ProductListActions'
import { StatusBadge } from './StatusBadge'

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

export function ProductTable({
  products,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  isSomeSelected,
  sortKey,
  sortOrder,
  onSort,
}: ProductTableProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              {/* Checkbox column */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected && !isAllSelected
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-border accent-pink-500 cursor-pointer"
                />
              </th>
              <SortableHeader
                label={t('Product')}
                sortKey="name"
                currentKey={sortKey}
                order={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Status')}
                sortKey="status"
                currentKey={sortKey}
                order={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Inventory')}
                sortKey="inventory"
                currentKey={sortKey}
                order={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Price')}
                sortKey="price"
                currentKey={sortKey}
                order={sortOrder}
                onSort={onSort}
              />
              <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {t('SKU')}
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {products.map((product) => (
              <tr
                key={product.id}
                className={`hover:bg-muted/20 transition-colors group ${selectedIds.has(product.id) ? 'bg-pink-500/5' : ''}`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => onToggleSelect(product.id)}
                    className="w-4 h-4 rounded border-border accent-pink-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
                  <StatusBadge status={product.status} />
                </td>
                <td className="px-6 py-4">
                  <InventoryIndicator quantity={product.inventoryQuantity} />
                </td>
                <td className="px-6 py-4">
                  <PriceDisplay
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-muted-foreground">
                    {product.sku || '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
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

function SortableHeader({
  label,
  sortKey,
  currentKey,
  order,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  order: SortOrder
  onSort: (key: SortKey) => void
}) {
  const isActive = sortKey === currentKey

  return (
    <th className="text-left px-6 py-3">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground transition-colors group/header"
      >
        {label}
        <span className="w-3.5 h-3.5">
          {isActive ? (
            order === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-pink-500" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-pink-500" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-50 transition-opacity" />
          )}
        </span>
      </button>
    </th>
  )
}

function InventoryIndicator({ quantity }: { quantity: number }) {
  const { t } = useTranslation()
  const isLow = quantity < 5
  const isOut = quantity === 0

  return (
    <div className="space-y-1">
      <div className="h-1 w-14 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isOut ? 'bg-destructive' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(quantity, 100)}%` }}
        />
      </div>
      <p
        className={`text-[10px] font-bold uppercase tracking-wide ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-foreground/70'}`}
      >
        {quantity} {quantity === 1 ? t('unit') : t('units')}
      </p>
    </div>
  )
}

function PriceDisplay({
  price,
  compareAtPrice,
}: {
  price: string | null
  compareAtPrice: string | null
}) {
  if (price === null) {
    return <span className="text-muted-foreground text-xs font-medium">—</span>
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold">${Number(price).toFixed(2)}</span>
      {compareAtPrice && (
        <span className="text-[10px] text-muted-foreground line-through">
          ${Number(compareAtPrice).toFixed(2)}
        </span>
      )}
    </div>
  )
}

export function ProductTableSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="w-12 px-4 py-3">
                <div className="w-4 h-4 bg-muted rounded" />
              </th>
              {['Product', 'Status', 'Inventory', 'Price', 'SKU', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-4">
                  <div className="w-4 h-4 bg-muted rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="h-2 w-20 bg-muted rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-1 w-14 bg-muted rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-12 bg-muted rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-3 w-16 bg-muted rounded" />
                </td>
                <td className="px-6 py-4" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
