import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { bulkUpdateProductsFn } from '../../../../server/products'
import { Button } from '../../../ui/button'

interface BulkActionsBarProps {
  selectedCount: number
  selectedIds: Set<string>
  onClearSelection: () => void
}

export const BulkActionsBar = ({
  selectedCount,
  selectedIds,
  onClearSelection,
}: BulkActionsBarProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    onClearSelection()
  }

  // Single bulk mutation for all operations
  const bulkMutation = useMutation({
    mutationFn: async ({
      action,
    }: {
      action: 'delete' | 'archive' | 'activate'
    }) => {
      const result = await bulkUpdateProductsFn({
        data: {
          action,
          ids: Array.from(selectedIds),
        },
      })
      if (!result.success) throw new Error('Bulk operation failed')
      return { action, result }
    },
    onSuccess: ({ action }) => {
      handleSuccess()
      if (action === 'delete') {
        toast.success(t('{{count}} items deleted', { count: selectedCount }))
      } else if (action === 'archive') {
        toast.success(t('{{count}} items archived', { count: selectedCount }))
      } else {
        toast.success(t('{{count}} items activated', { count: selectedCount }))
      }
    },
    onError: () => {
      toast.error(t('Failed to update items'))
    },
  })

  if (selectedCount === 0) return null

  const isPending = bulkMutation.isPending

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
          onClick={() => bulkMutation.mutate({ action: 'activate' })}
          disabled={isPending}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t('Activate')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() => bulkMutation.mutate({ action: 'archive' })}
          disabled={isPending}
        >
          <Archive className="w-3.5 h-3.5" />
          {t('Archive')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 gap-1.5 font-medium"
          onClick={() => bulkMutation.mutate({ action: 'delete' })}
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
