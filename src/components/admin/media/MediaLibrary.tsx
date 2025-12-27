import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Check, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getOptimizedImageUrl } from '../../../lib/cloudinary'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'

type LocalizedString = { en: string; fr?: string; id?: string }

export type MediaItem = {
  id: string
  url: string
  publicId?: string
  filename?: string
  width?: number
  height?: number
  size?: number
  altText?: LocalizedString
}

type MediaLibraryProps = {
  open: boolean
  onClose: () => void
  onSelect: (items: MediaItem[]) => void
  multiple?: boolean
}

export function MediaLibrary({
  open,
  onClose,
  onSelect,
  multiple = true,
}: MediaLibraryProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)

  // Fetch media items
  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fetch('/api/media', { credentials: 'include' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.items as MediaItem[]
    },
    enabled: open,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-pink-500" />
            {t('Media Library')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-muted/30 p-1 rounded-xl mb-4">
            <TabsTrigger
              value="library"
              className="rounded-lg px-4 py-1.5 text-xs font-semibold"
            >
              {t('Library')}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="rounded-lg px-4 py-1.5 text-xs font-semibold"
            >
              {t('Upload')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 overflow-auto m-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">{t('No media yet')}</p>
                <p className="text-xs">{t('Upload images to get started')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-pink-500 ring-2 ring-pink-500/30'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(item.url, 'thumbnail')}
                        alt={item.filename || 'Media'}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 m-0">
            <div
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border/50 rounded-2xl hover:border-pink-500/50 hover:bg-pink-500/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t('Click or drag to upload')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    JPEG, PNG, GIF, WebP, HEIC (max 20MB)
                  </p>
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

        <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t">
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('Delete')} ({selectedIds.size})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleInsert}
              disabled={selectedIds.size === 0}
              className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white"
            >
              {t('Insert')} {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
