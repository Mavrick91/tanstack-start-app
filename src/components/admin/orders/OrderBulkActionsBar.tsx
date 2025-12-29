import { Clock, Package, Truck, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'

interface OrderBulkActionsBarProps {
  selectedCount: number
  selectedIds: Set<string>
  onClearSelection: () => void
  onBulkAction: (actionType: string, value: string) => void
  isLoading?: boolean
}

export function OrderBulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkAction,
  isLoading = false,
}: OrderBulkActionsBarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-5 py-3 bg-foreground text-background rounded-2xl shadow-2xl border border-background/10">
        <span className="text-sm font-semibold">
          {selectedCount} {t('selected')}
        </span>
        <div className="w-px h-5 bg-background/20" />

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() => onBulkAction('status', 'processing')}
          disabled={isLoading}
        >
          <Clock className="w-3.5 h-3.5" />
          {t('Processing')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() => onBulkAction('status', 'shipped')}
          disabled={isLoading}
        >
          <Truck className="w-3.5 h-3.5" />
          {t('Shipped')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-background hover:bg-background/10 hover:text-background gap-1.5 font-medium"
          onClick={() => onBulkAction('fulfillmentStatus', 'fulfilled')}
          disabled={isLoading}
        >
          <Package className="w-3.5 h-3.5" />
          {t('Fulfilled')}
        </Button>

        <div className="w-px h-5 bg-background/20" />

        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-background/10 rounded-lg transition-colors"
          disabled={isLoading}
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
