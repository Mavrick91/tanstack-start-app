import { Link } from '@tanstack/react-router'
import { ArrowRight, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CollectionListActions } from './CollectionListActions'
import { CollectionThumbnail } from '../../../collections/CollectionThumbnail'
import { AdminStatusBadge } from '../../components/AdminStatusBadge'
import {
  SortableHeader,
  type SortOrder,
} from '../../components/SortableHeader'

import type { CollectionListItem } from '../types'

export type SortKey = 'name' | 'productCount' | 'createdAt'
export type { SortOrder }

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
                currentSortKey={sortKey}
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
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t('Created')}
                sortKey="createdAt"
                currentSortKey={sortKey}
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
                className={`cursor-pointer hover:bg-muted/50 transition-all duration-200 group ${selectedIds.has(collection.id) ? 'bg-pink-500/5' : ''}`}
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
                  <AdminStatusBadge
                    status={collection.publishedAt ? 'active' : 'draft'}
                    variant="collection"
                  />
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
