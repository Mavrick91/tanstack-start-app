import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  AdminBulkActionsBar,
  type BulkAction,
} from '../../components/AdminBulkActionsBar'
import {
  bulkDeleteCollectionsFn,
  bulkUpdateCollectionsStatusFn,
} from '../../../../server/collections'

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
      const action = (variables?.data as { action?: string })?.action
      // Map server actions to user-facing terminology
      if (action === 'publish') {
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

  // Use "Activate/Archive" terminology (maps to publish/unpublish on server)
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
    const ids = Array.from(selectedIds)
    if (actionKey === 'delete') {
      deleteMutation.mutate({ data: { ids } })
    } else if (actionKey === 'activate') {
      // Map "activate" to server's "publish" action
      statusMutation.mutate({ data: { ids, action: 'publish' } })
    } else if (actionKey === 'archive') {
      // Map "archive" to server's "unpublish" action
      statusMutation.mutate({ data: { ids, action: 'unpublish' } })
    }
  }

  return (
    <AdminBulkActionsBar
      selectedCount={selectedCount}
      actions={actions}
      onAction={handleAction}
      onClear={onClearSelection}
      isPending={isPending}
    />
  )
}
