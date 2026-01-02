import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  deleteCollectionFn,
  duplicateCollectionFn,
  publishCollectionFn,
  unpublishCollectionFn,
} from '../../../../server/collections'
import { AdminRowActions } from '../../components/AdminRowActions'

interface CollectionListActionsProps {
  collectionId: string
  handle: string
  name: string
  status: 'active' | 'draft' | 'archived'
}

export const CollectionListActions = ({
  collectionId,
  handle,
  name,
  status,
}: CollectionListActionsProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection deleted'))
    },
    onError: () => {
      toast.error(t('Failed to delete collection'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection duplicated'))
    },
    onError: () => {
      toast.error(t('Failed to duplicate collection'))
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => publishCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection published'))
    },
    onError: () => {
      toast.error(t('Failed to publish collection'))
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishCollectionFn({ data: { id: collectionId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Collection unpublished'))
    },
    onError: () => {
      toast.error(t('Failed to unpublish collection'))
    },
  })

  const handleStatusChange = (newStatus: 'active' | 'draft' | 'archived') => {
    if (newStatus === 'active') {
      publishMutation.mutate()
    } else {
      unpublishMutation.mutate()
    }
  }

  return (
    <AdminRowActions
      editUrl={`/admin/collections/${collectionId}`}
      storefrontUrl={`/en/collections/${handle}`}
      onDuplicate={() => duplicateMutation.mutate()}
      isDuplicatePending={duplicateMutation.isPending}
      status={status}
      onStatusChange={handleStatusChange}
      isStatusPending={publishMutation.isPending || unpublishMutation.isPending}
      itemName={name}
      onDelete={() => deleteMutation.mutate()}
    />
  )
}
