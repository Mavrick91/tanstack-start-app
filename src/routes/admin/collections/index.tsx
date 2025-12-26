import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  FolderOpen,
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Package,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { getCollectionsFn } from '../../../server/collections'
import { cn } from '../../../lib/utils'

type LocalizedString = { en: string; fr?: string; id?: string }

interface CollectionListItem {
  id: string
  handle: string
  name: LocalizedString
  imageUrl?: string
  productCount: number
  publishedAt: string | Date | null
  createdAt: string | Date
}

export const Route = createFileRoute('/admin/collections/')({
  component: CollectionsPage,
})

function CollectionsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['collections'],
    queryFn: () => getCollectionsFn(),
  })

  const collections = (data?.data || []) as CollectionListItem[]

  const filteredCollections = collections.filter(
    (c) =>
      c.name.en.toLowerCase().includes(search.toLowerCase()) ||
      c.handle.toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-pink-500/20 border-t-pink-500" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          {t('Syncing Collections...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 bg-card rounded-3xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-1">
          {t('Failed to load collections')}
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          {t('Please check your connection or try logging in again.')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('Collections')}</h1>
          <p className="text-muted-foreground font-medium text-sm">
            {t('Curate and organize your products for the storefront')}
          </p>
        </div>
        <Link to="/admin/collections/new">
          <Button className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm font-semibold gap-2 transition-all">
            <Plus className="w-4 h-4" />
            {t('Create Collection')}
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex gap-4 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            placeholder={t('Search collections...')}
            className="w-full h-11 pl-11 pr-4 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-pink-500/10 transition-all font-medium text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-xl border-border bg-background gap-2 font-semibold px-5 shadow-sm"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          {t('Filters')}
        </Button>
      </div>

      {/* Collections Table */}
      {filteredCollections.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="w-16 h-16 bg-pink-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-pink-500/40" />
          </div>
          <h3 className="text-xl font-bold mb-1">
            {search
              ? t('No results match your search')
              : t('Your collection gallery is empty')}
          </h3>
          <p className="text-muted-foreground text-xs font-medium mb-6 max-w-xs mx-auto">
            {search
              ? t('Try adjusting your search terms or filters.')
              : t('Start curating your products into beautiful, themed collections.')}
          </p>
          {!search && (
            <Link to="/admin/collections/new">
              <Button
                variant="outline"
                className="rounded-xl h-10 px-6 font-semibold"
              >
                {t('Create your first collection')}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t('Collection')}
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t('Status')}
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t('Handle')}
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t('Products')}
                  </th>
                  <th className="text-left px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t('Created')}
                  </th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCollections.map((collection) => (
                  <tr
                    key={collection.id}
                    className="hover:bg-muted/20 transition-all duration-200 group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 overflow-hidden border border-border/50 shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {collection.imageUrl ? (
                            <img
                              src={collection.imageUrl}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <FolderOpen className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full hover:bg-pink-50 hover:text-pink-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 rounded-2xl p-2 border-border/50 shadow-2xl backdrop-blur-xl bg-card/95"
                        >
                          <DropdownMenuLabel className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                            {t('Quick Actions')}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl cursor-pointer py-2.5"
                          >
                            <Link
                              to="/admin/collections/$collectionId"
                              params={{ collectionId: collection.id }}
                            >
                              <MoreHorizontal className="mr-3 h-4 w-4" />
                              <span className="font-bold text-sm">
                                {t('Edit Details')}
                              </span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl cursor-pointer py-2.5"
                          >
                            <a
                              href={`/en/collections/${collection.handle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="mr-3 h-4 w-4" />
                              <span className="font-bold text-sm">
                                {t('View Storefront')}
                              </span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

function StatusBadge({ publishedAt, t }: { publishedAt: string | Date | null, t: any }) {
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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
        current.bg
      )}
    >
      <div className={cn("w-1 h-1 rounded-full", current.dot)} />
      <span className={cn("text-[9px] font-bold uppercase tracking-wider", current.text)}>
        {t(status === 'active' ? 'Active' : 'Draft')}
      </span>
    </div>
  )
}