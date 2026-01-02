import { Link } from '@tanstack/react-router'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Check,
  ExternalLink,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

export interface StatusAction {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export interface AdminRowActionsProps {
  // View action
  viewUrl?: string
  viewLabel?: string

  // Edit action (products/collections style)
  editUrl?: string

  // Storefront link
  storefrontUrl?: string

  // Duplicate action
  onDuplicate?: () => void
  isDuplicatePending?: boolean

  // Archive/Activate toggle
  status?: 'draft' | 'active' | 'archived'
  onStatusChange?: (newStatus: 'draft' | 'active' | 'archived') => void
  isStatusPending?: boolean

  // Delete action with confirmation
  itemName?: string
  onDelete?: () => void
  deleteConfirmTitle?: string
  deleteConfirmDescription?: string

  // Status workflow actions (orders style)
  statusActions?: StatusAction[]
  statusActionsLabel?: string

  // Destructive action with confirmation (e.g., Cancel Order)
  destructiveAction?: {
    label: string
    icon: LucideIcon
    confirmTitle: string
    confirmDescription: string
    onConfirm: () => void
  }

  // Loading state
  isLoading?: boolean
}

export const AdminRowActions = ({
  viewUrl,
  viewLabel,
  editUrl,
  storefrontUrl,
  onDuplicate,
  isDuplicatePending,
  status,
  onStatusChange,
  isStatusPending,
  itemName,
  onDelete,
  deleteConfirmTitle,
  deleteConfirmDescription,
  statusActions,
  statusActionsLabel,
  destructiveAction,
  isLoading = false,
}: AdminRowActionsProps) => {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDestructiveDialog, setShowDestructiveDialog] = useState(false)

  const handleArchiveToggle = () => {
    if (!onStatusChange || !status) return
    const newStatus = status === 'archived' ? 'active' : 'archived'
    onStatusChange(newStatus)
  }

  const handleDelete = () => {
    onDelete?.()
    setShowDeleteDialog(false)
  }

  const handleDestructiveConfirm = () => {
    destructiveAction?.onConfirm()
    setShowDestructiveDialog(false)
  }

  const hasQuickActions =
    viewUrl || editUrl || storefrontUrl || onDuplicate || (status && onStatusChange)
  const hasStatusActions = statusActions && statusActions.length > 0

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
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-2xl p-2 border-border/50 shadow-2xl backdrop-blur-xl bg-card/95"
        >
          {hasQuickActions && (
            <>
              <DropdownMenuLabel className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                {t('Quick Actions')}
              </DropdownMenuLabel>

              {viewUrl && (
                <DropdownMenuItem
                  asChild
                  className="rounded-xl cursor-pointer py-2.5"
                >
                  <Link to={viewUrl} className="flex items-center gap-3">
                    <Eye className="w-4 h-4" />
                    <span className="font-bold text-sm">
                      {viewLabel || t('View Details')}
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}

              {editUrl && (
                <DropdownMenuItem
                  asChild
                  className="rounded-xl cursor-pointer py-2.5"
                >
                  <Link to={editUrl} className="flex items-center gap-3">
                    <Pencil className="w-4 h-4" />
                    <span className="font-bold text-sm">{t('Edit Details')}</span>
                  </Link>
                </DropdownMenuItem>
              )}

              {storefrontUrl && (
                <DropdownMenuItem
                  asChild
                  className="rounded-xl cursor-pointer py-2.5"
                >
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-bold text-sm">
                      {t('View Storefront')}
                    </span>
                  </a>
                </DropdownMenuItem>
              )}

              {onDuplicate && (
                <DropdownMenuItem
                  onClick={onDuplicate}
                  disabled={isDuplicatePending || isLoading}
                  className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3"
                >
                  <Copy className="w-4 h-4" />
                  <span className="font-bold text-sm">{t('Duplicate')}</span>
                </DropdownMenuItem>
              )}

              {onStatusChange && status && (
                <DropdownMenuItem
                  onClick={handleArchiveToggle}
                  disabled={isStatusPending || isLoading}
                  className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3"
                >
                  {status === 'archived' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="font-bold text-sm">{t('Activate')}</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span className="font-bold text-sm">{t('Archive')}</span>
                    </>
                  )}
                </DropdownMenuItem>
              )}
            </>
          )}

          {hasStatusActions && (
            <>
              {hasQuickActions && (
                <DropdownMenuSeparator className="my-1 bg-border/50" />
              )}
              <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                {statusActionsLabel || t('Update Status')}
              </DropdownMenuLabel>

              {statusActions.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={action.onClick}
                    disabled={action.disabled || isLoading}
                    className={`rounded-xl cursor-pointer py-2.5 flex items-center gap-3 ${
                      action.variant === 'destructive'
                        ? 'text-destructive focus:text-destructive focus:bg-destructive/5'
                        : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-bold text-sm">{action.label}</span>
                  </DropdownMenuItem>
                )
              })}
            </>
          )}

          {destructiveAction && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem
                onClick={() => setShowDestructiveDialog(true)}
                disabled={isLoading}
                className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3 text-destructive focus:text-destructive focus:bg-destructive/5"
              >
                <destructiveAction.icon className="w-4 h-4" />
                <span className="font-bold text-sm">
                  {destructiveAction.label}
                </span>
              </DropdownMenuItem>
            </>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
                className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3 text-destructive focus:text-destructive focus:bg-destructive/5"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-bold text-sm">{t('Delete')}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmTitle || t('Are you sure?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmDescription ||
                t(
                  'This will permanently delete "{{name}}". This action cannot be undone.',
                  { name: itemName },
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

      {/* Destructive action confirmation dialog */}
      {destructiveAction && (
        <AlertDialog
          open={showDestructiveDialog}
          onOpenChange={setShowDestructiveDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {destructiveAction.confirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {destructiveAction.confirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDestructiveConfirm}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('Confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
