import { Link } from '@tanstack/react-router'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Check,
  ExternalLink,
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

export interface DataListDropdownProps {
  itemId: string
  itemName: string
  status: 'draft' | 'active' | 'archived'
  editUrl: string
  storefrontUrl?: string
  onDuplicate?: () => void
  onDelete?: () => void
  onStatusChange?: (newStatus: 'draft' | 'active' | 'archived') => void
  isDuplicatePending?: boolean
  isStatusPending?: boolean
}

export function DataListDropdown({
  itemName,
  status,
  editUrl,
  storefrontUrl,
  onDuplicate,
  onDelete,
  onStatusChange,
  isDuplicatePending,
  isStatusPending,
}: DataListDropdownProps) {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleArchiveToggle = () => {
    if (!onStatusChange) return
    const newStatus = status === 'archived' ? 'active' : 'archived'
    onStatusChange(newStatus)
  }

  const handleDelete = () => {
    onDelete?.()
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
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-2xl p-2 border-border/50 shadow-2xl backdrop-blur-xl bg-card/95"
        >
          <DropdownMenuLabel className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
            {t('Quick Actions')}
          </DropdownMenuLabel>

          <DropdownMenuItem
            asChild
            className="rounded-xl cursor-pointer py-2.5"
          >
            <Link to={editUrl} className="flex items-center gap-3">
              <Pencil className="w-4 h-4" />
              <span className="font-bold text-sm">{t('Edit Details')}</span>
            </Link>
          </DropdownMenuItem>

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
              disabled={isDuplicatePending}
              className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3"
            >
              <Copy className="w-4 h-4" />
              <span className="font-bold text-sm">{t('Duplicate')}</span>
            </DropdownMenuItem>
          )}

          {onStatusChange && (
            <DropdownMenuItem
              onClick={handleArchiveToggle}
              disabled={isStatusPending}
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

          {onDelete && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-xl cursor-pointer py-2.5 flex items-center gap-3 text-destructive focus:text-destructive focus:bg-destructive/5"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-bold text-sm">{t('Delete')}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
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
    </>
  )
}
