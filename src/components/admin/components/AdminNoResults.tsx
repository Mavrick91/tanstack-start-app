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
    <div className="text-center py-10 bg-white border border-stone-200 rounded-2xl shadow-sm">
      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Search className="w-5 h-5 text-stone-400" />
      </div>
      <p className="text-stone-500 text-sm mb-4">
        {message || t('No products match your filters.')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg px-5 border-stone-200 hover:bg-stone-50"
        onClick={onClear}
        aria-label={clearLabel || t('Clear filters')}
      >
        {clearLabel || t('Clear Filters')}
      </Button>
    </div>
  )
}
