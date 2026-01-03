import { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  icon?: ReactNode
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'default' | 'destructive'
  isLoading?: boolean
  dismissible?: boolean
}

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'default',
  isLoading = false,
  dismissible = true,
}: ConfirmationDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (dismissible && !isLoading) {
            onCancel()
          }
        }
        onOpenChange?.(isOpen)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[400px] p-5 rounded-2xl border-border/40 shadow-2xl bg-background/95 backdrop-blur-sm gap-4 focus:ring-0"
        onPointerDownOutside={(e: Event) => {
          if (!dismissible || isLoading) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e: KeyboardEvent) => {
          if (!dismissible || isLoading) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="h-9 px-4 rounded-xl text-xs font-medium hover:bg-muted"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            className="h-9 px-4 rounded-xl text-xs font-bold shadow-sm"
            disabled={isLoading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
