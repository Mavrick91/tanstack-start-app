import { cn } from '../../../lib/utils'

export type StatusFilterTabsProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

export const StatusFilterTabs = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Filter by status',
}: StatusFilterTabsProps<T>) => {
  return (
    <div
      className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
