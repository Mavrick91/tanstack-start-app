import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  bulkDeleteCollectionsFn,
  bulkUpdateCollectionsStatusFn,
} from '../../../../server/collections'
import { Button } from '../../../ui/button'

interface BulkActionsBarProps {
  selectedCount: number
  selectedIds: Set<string>
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    onClearSelection()
  }

  const deleteMutation = useMutation({
    mutationFn: bulkDeleteCollectionsFn,
    onSuccess: (data) => {
      handleSuccess()
      toast.success(t('{{count}} items deleted', { count: data.count }))
    },
    onError: () => {
      toast.error(t('Failed to delete items'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: bulkUpdateCollectionsStatusFn,
    onSuccess: (data, variables) => {
      handleSuccess()
      if (variables.data.action === 'publish') {
        toast.success(t('{{count}} items activated', { count: data.count }))
      } else {
        toast.success(t('{{count}} items archived', { count: data.count }))
      }
    },
    onError: () => {
      toast.error(t('Failed to update items'))
    },
  })

  const isPending = deleteMutation.isPending || statusMutation.isPending

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-5 py-3 bg-foreground text-background rounded-2xl shadow-2xl border border-background/10">
        <span className="text-sm font-semibold">
          {t('{{count}} selected', { count: selectedCount })}
        </span>
        <div className="w-px h-5 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() =>
            statusMutation.mutate({
              data: { ids: Array.from(selectedIds), action: 'publish' },
            })
          }
          disabled={isPending}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t('Publish')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() =>
            statusMutation.mutate({
              data: { ids: Array.from(selectedIds), action: 'unpublish' },
            })
          }
          disabled={isPending}
        >
          <Archive className="w-3.5 h-3.5" />
          {t('Unpublish')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 gap-1.5 font-medium"
          onClick={() =>
            deleteMutation.mutate({ data: { ids: Array.from(selectedIds) } })
          }
          disabled={isPending}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('Delete')}
        </Button>
        <div className="w-px h-5 bg-background/20" />
        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-background/10 rounded-lg transition-colors"
          disabled={isPending}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
