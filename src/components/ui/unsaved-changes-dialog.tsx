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
} from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onProceed: () => void
  onCancel: () => void
}

export const UnsavedChangesDialog = ({
  open,
  onProceed,
  onCancel,
}: UnsavedChangesDialogProps) => {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="rounded-2xl border-border/50 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold">
            {t('Unsaved Changes')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t(
              'You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?',
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="rounded-xl border-border/50"
          >
            {t('Stay on Page')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {t('Leave Without Saving')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
