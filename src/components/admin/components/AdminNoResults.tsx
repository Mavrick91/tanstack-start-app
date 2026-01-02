import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'

export interface AdminNoResultsProps {
  message?: string
  onClear: () => void
  clearLabel?: string
}

export const AdminNoResults = ({
  message,
  onClear,
  clearLabel,
}: AdminNoResultsProps) => {
  const { t } = useTranslation()

  return (
    <div className="text-center py-10 bg-card border border-border rounded-lg">
      <div className="w-12 h-12 bg-muted/50 rounded-md flex items-center justify-center mx-auto mb-4 border border-border">
        <Search className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        {message || t('No products match your filters.')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-md px-5"
        onClick={onClear}
        aria-label={clearLabel || t('Clear filters')}
      >
        {clearLabel || t('Clear Filters')}
      </Button>
    </div>
  )
}
