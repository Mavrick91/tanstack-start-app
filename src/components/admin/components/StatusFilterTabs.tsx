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
      className="flex gap-1.5 p-1 bg-stone-100 rounded-lg"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3.5 py-1.5 rounded-md text-xs font-medium transition-all',
            value === opt.value
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700',
          )}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
