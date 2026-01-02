import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Check, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getOptimizedImageUrl } from '../../../lib/cloudinary'
import { cn } from '../../../lib/utils'
import { getMediaFn, deleteMediaFn } from '../../../server/media'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'

type LocalizedString = { en: string; fr?: string; id?: string }

export type MediaItem = {
  id: string
  url: string
  publicId?: string | null
  filename?: string | null
  width?: number | null
  height?: number | null
  size?: number | null
  altText?: LocalizedString | null
}

type MediaLibraryProps = {
  open: boolean
  onClose: () => void
  onSelect: (items: MediaItem[]) => void
  multiple?: boolean
}

export const MediaLibrary = ({
  open,
  onClose,
  onSelect,
  multiple = true,
}: MediaLibraryProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)

  // Fetch media items
  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => getMediaFn(),
    enabled: open,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteMediaFn({ data: { ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setSelectedIds(new Set())
      toast.success(t('Media deleted'))
    },
    onError: () => {
      toast.error(t('Failed to delete media'))
    },
  })

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setIsUploading(true)
      const uploadedIds: string[] = []

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData()
          formData.append('file', file)

          const res = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          })
          const json = await res.json()

          if (json.success) {
            uploadedIds.push(json.id)
          } else {
            toast.error(`${file.name}: ${json.error}`)
          }
        } catch {
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      if (uploadedIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['media'] })
        toast.success(
          t('{{count}} image(s) uploaded', { count: uploadedIds.length }),
        )
      }

      setIsUploading(false)
    },
    [queryClient, t],
  )

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleInsert = () => {
    if (!data) return
    const selectedItems = data.filter((item) => selectedIds.has(item.id))
    onSelect(selectedItems)
    setSelectedIds(new Set())
    onClose()
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) return
    deleteMutation.mutate(Array.from(selectedIds))
  }

  const items = data || []

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-7xl! w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden border-border bg-background rounded-lg">
        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between pr-8">
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-500" />
                  {t('Media Library')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t('Manage your products and inventory')}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-4">
                {selectedIds.size > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 bg-pink-100 text-pink-700 border-pink-200"
                  >
                    {t('{{count}} selected', { count: selectedIds.size })}
                  </Badge>
                )}
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
                  <TabsTrigger
                    value="library"
                    className="data-[state=active]:bg-white data-[state=active]:text-pink-600"
                  >
                    {t('Library')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-pink-600"
                  >
                    <Upload className="w-4 h-4" />
                    {t('Upload')}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </DialogHeader>

          <TabsContent value="library" className="flex-1 overflow-auto m-0 p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                <p className="text-sm font-medium text-pink-500">
                  {t('Library')}
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-pink-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t('No media yet')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('Upload images to get started')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={cn(
                        'group relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                        isSelected
                          ? 'border-pink-500 ring-2 ring-pink-500/20'
                          : 'border-transparent bg-muted/20 hover:border-pink-200',
                      )}
                    >
                      <img
                        src={getOptimizedImageUrl(item.url, 'medium')}
                        alt={item.filename || 'Media'}
                        className="w-full h-full object-cover"
                      />

                      {/* Selected State Marker */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-pink-500/10 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-sm">
                            <Check className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 m-0 p-6">
            <div
              className={cn(
                'flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg transition-colors',
                isUploading
                  ? 'border-pink-500/50 bg-pink-50 cursor-wait'
                  : 'border-muted-foreground/25 hover:border-pink-500/50 hover:bg-pink-50/50 cursor-pointer',
              )}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                  <p className="text-sm font-medium animate-pulse text-pink-500">
                    {t('Uploading...')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-pink-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">
                      {t('Click or drag to upload')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, GIF, WebP (MAX. 20MB)
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                icon={<Trash2 className="w-4 h-4" />}
              >
                {t('Delete')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleInsert}
              disabled={selectedIds.size === 0}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {t('Insert')}
              {selectedIds.size > 0 && (
                <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs text-white">
                  {selectedIds.size}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
