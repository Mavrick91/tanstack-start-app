import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  AdminBulkActionsBar,
  type BulkAction,
} from '../../components/AdminBulkActionsBar'
import { bulkUpdateProductsFn } from '../../../../server/products'

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

  const actions: BulkAction[] = [
    {
      key: 'activate',
      label: t('Activate'),
      icon: CheckCircle2,
    },
    {
      key: 'archive',
      label: t('Archive'),
      icon: Archive,
    },
    {
      key: 'delete',
      label: t('Delete'),
      icon: Trash2,
      variant: 'destructive',
    },
  ]

  const handleAction = (actionKey: string) => {
    bulkMutation.mutate({ action: actionKey as 'delete' | 'archive' | 'activate' })
  }

  return (
    <AdminBulkActionsBar
      selectedCount={selectedCount}
      actions={actions}
      onAction={handleAction}
      onClear={onClearSelection}
      isPending={bulkMutation.isPending}
    />
  )
}
