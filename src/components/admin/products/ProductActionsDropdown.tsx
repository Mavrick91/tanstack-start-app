import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  deleteProductFn,
  duplicateProductFn,
  updateProductStatusFn,
} from '../../../server/products'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

interface ProductActionsDropdownProps {
  productId: string
  productName: string
  status: 'draft' | 'active' | 'archived'
  onSuccess?: () => void
}

export function ProductActionsDropdown({
  productId,
  productName,
  status,
  onSuccess,
}: ProductActionsDropdownProps) {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    onSuccess?.()
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

  const handleDuplicate = () => {
    duplicateMutation.mutate()
  }

  const handleArchiveToggle = () => {
    const newStatus = status === 'archived' ? 'active' : 'archived'
    statusMutation.mutate(newStatus)
  }

  const handleDelete = () => {
    deleteMutation.mutate()
    setShowDeleteDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-pink-500/5 group text-muted-foreground"
          >
            <MoreHorizontal className="w-4 h-4 transition-transform group-hover:scale-110" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link
              to="/admin/products/$productId"
              params={{ productId }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              {t('Edit')}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            {t('Duplicate')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleArchiveToggle}
            disabled={statusMutation.isPending}
            className="flex items-center gap-2 cursor-pointer"
          >
            {status === 'archived' ? (
              <>
                <Check className="w-4 h-4" />
                {t('Activate')}
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                {t('Archive')}
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            {t('Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'This will permanently delete "{{name}}". This action cannot be undone.',
                { name: productName },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
