import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ConfirmationDialog } from './confirmation-dialog'

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
    <ConfirmationDialog
      open={open}
      title={t('Unsaved Changes')}
      description={t(
        'You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?',
      )}
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
      confirmText={t('Leave Without Saving')}
      cancelText={t('Stay on Page')}
      onConfirm={onProceed}
      onCancel={onCancel}
      variant="destructive"
    />
  )
}
