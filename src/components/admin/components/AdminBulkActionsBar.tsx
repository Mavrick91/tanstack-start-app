import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../ui/button'

import type { LucideIcon } from 'lucide-react'

export type BulkAction = {
  key: string
  label: string
  icon: LucideIcon
  variant?: 'default' | 'destructive'
}

export type AdminBulkActionsBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onAction: (actionKey: string) => void
  onClear: () => void
  isPending?: boolean
}

export const AdminBulkActionsBar = ({
  selectedCount,
  actions,
  onAction,
  onClear,
  isPending = false,
}: AdminBulkActionsBarProps) => {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-5 py-3 bg-stone-900 text-white rounded-xl shadow-lg">
        <span className="text-sm font-semibold">
          {t('{{count}} selected', { count: selectedCount })}
        </span>
        <div className="w-px h-5 bg-white/20" />
        {actions.map((action) => {
          const Icon = action.icon
          const isDestructive = action.variant === 'destructive'

          return (
            <Button
              key={action.key}
              size="sm"
              variant="ghost"
              className={
                isDestructive
                  ? 'h-8 px-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1.5 font-medium'
                  : 'h-8 px-3 text-white hover:bg-white/10 gap-1.5 font-medium'
              }
              onClick={() => onAction(action.key)}
              disabled={isPending}
              icon={<Icon className="w-4 h-4" />}
            >
              {action.label}
            </Button>
          )
        })}
        <div className="w-px h-5 bg-white/20" />
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          disabled={isPending}
          aria-label={t('Clear selection')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
