import { Link } from '@tanstack/react-router'
import { TFunction } from 'i18next'
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CollectionListActions } from './CollectionListActions'
import { cn } from '../../../../lib/utils'
import { CollectionThumbnail } from '../../../collections/CollectionThumbnail'

import type { CollectionListItem } from '../types'

export type SortKey = 'name' | 'productCount' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

interface CollectionTableProps {
  collections: CollectionListItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  isAllSelected: boolean
  isSomeSelected: boolean
  sortKey: SortKey
  sortOrder: SortOrder
  onSort: (key: SortKey) => void
}

export const CollectionTable = ({
  collections,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  isSomeSelected,
  sortKey,
  sortOrder,
  onSort,
}: CollectionTableProps) => {
  const { t } = useTranslation()

  return (
    <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              {/* Checkbox column */}
              <th className="w-12 px-8 py-4">
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
                label={t('Collection')}
                sortKey="name"
                currentSort={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {t('Status')}
              </th>
              <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {t('Handle')}
              </th>
              <SortableHeader
                label={t('Products')}
                sortKey="productCount"
                currentSort={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Created')}
                sortKey="createdAt"
                currentSort={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="px-8 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {collections.map((collection) => (
              <tr
                key={collection.id}
                className={`hover:bg-muted/20 transition-all duration-200 group ${selectedIds.has(collection.id) ? 'bg-pink-500/5' : ''}`}
              >
                <td className="px-8 py-5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(collection.id)}
                    onChange={() => onToggleSelect(collection.id)}
                    className="w-4 h-4 rounded border-border accent-pink-500 cursor-pointer"
                  />
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 overflow-hidden border border-border/50 shrink-0 group-hover:scale-105 transition-transform duration-300">
                      <CollectionThumbnail
                        images={collection.previewImages || []}
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to="/admin/collections/$collectionId"
                        params={{ collectionId: collection.id }}
                        className="text-sm font-semibold truncate hover:text-pink-500 transition-colors flex items-center gap-2 group/link"
                      >
                        {collection.name.en}
                        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-pink-500" />
                      </Link>
                      {collection.name.fr && (
                        <p className="text-[10px] text-muted-foreground/60 italic truncate">
                          {collection.name.fr}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <StatusBadge publishedAt={collection.publishedAt} t={t} />
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md font-mono">
                    /{collection.handle}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-semibold tabular-nums">
                      {collection.productCount}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(collection.createdAt).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <CollectionListActions
                    collectionId={collection.id}
                    handle={collection.handle}
                    name={collection.name.en}
                    status={collection.publishedAt ? 'active' : 'draft'}
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

const StatusBadge = ({
  publishedAt,
  t,
}: {
  publishedAt: Date | null
  t: TFunction
}) => {
  const status = publishedAt ? 'active' : 'draft'

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
  }

  const current = styles[status]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
        current.bg,
      )}
    >
      <div className={cn('w-1 h-1 rounded-full', current.dot)} />
      <span
        className={cn(
          'text-[9px] font-bold uppercase tracking-wider',
          current.text,
        )}
      >
        {status === 'active' ? t('Active') : t('Draft')}
      </span>
    </div>
  )
}

const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  sortOrder,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  sortOrder: SortOrder
  onSort: (key: SortKey) => void
}) => {
  const isActive = sortKey === currentSort

  return (
    <th className="text-left px-8 py-4">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground transition-colors group/header"
      >
        {label}
        <span className="w-3.5 h-3.5">
          {isActive ? (
            sortOrder === 'asc' ? (
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

export const CollectionTableSkeleton = () => {
  return (
    <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <th className="w-12 px-8 py-4">
                <div className="w-4 h-4 bg-muted rounded" />
              </th>
              {[
                'Collection',
                'Status',
                'Handle',
                'Products',
                'Created',
                '',
              ].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-8 py-5">
                  <div className="w-4 h-4 bg-muted rounded" />
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="h-2 w-20 bg-muted rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </td>
                <td className="px-8 py-5">
                  <div className="h-4 w-24 bg-muted rounded" />
                </td>
                <td className="px-8 py-5">
                  <div className="h-4 w-12 bg-muted rounded" />
                </td>
                <td className="px-8 py-5">
                  <div className="h-3 w-20 bg-muted rounded" />
                </td>
                <td className="px-8 py-5" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
