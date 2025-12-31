import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  deleteProductFn,
  duplicateProductFn,
  updateProductStatusFn,
} from '../../../../server/products'
import { DataListDropdown } from '../../components/DataListDropdown'

interface ProductListActionsProps {
  productId: string
  productName: string
  handle: string
  status: 'draft' | 'active' | 'archived'
}

export const ProductListActions = ({
  productId,
  productName,
  handle,
  status,
}: ProductListActionsProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteProductFn({ data: { productId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Product deleted'))
    },
    onError: () => {
      toast.error(t('Failed to delete product'))
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateProductFn({ data: { productId } }),
    onSuccess: () => {
      handleSuccess()
      toast.success(t('Product duplicated'))
    },
    onError: () => {
      toast.error(t('Failed to duplicate product'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: 'draft' | 'active' | 'archived') =>
      updateProductStatusFn({ data: { productId, status: newStatus } }),
    onSuccess: (_, newStatus) => {
      handleSuccess()
      toast.success(
        newStatus === 'archived'
          ? t('Product archived')
          : t('Product activated'),
      )
    },
    onError: () => {
      toast.error(t('Failed to update product status'))
    },
  })

  return (
    <DataListDropdown
      itemId={productId}
      itemName={productName}
      status={status}
      editUrl={`/admin/products/${productId}`}
      storefrontUrl={`/en/products/${handle}`}
      onDelete={() => deleteMutation.mutate()}
      onDuplicate={() => duplicateMutation.mutate()}
      onStatusChange={(newStatus) => statusMutation.mutate(newStatus)}
      isDuplicatePending={duplicateMutation.isPending}
      isStatusPending={statusMutation.isPending}
    />
  )
}
