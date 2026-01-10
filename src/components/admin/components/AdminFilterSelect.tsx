import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FilterOption<T extends string = string> {
  value: T
  label: string
}

interface AdminFilterSelectProps<T extends string = string> {
  label: string
  value: T
  options: FilterOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export const AdminFilterSelect = <T extends string = string>({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: AdminFilterSelectProps<T>) => {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-stone-500">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label={ariaLabel}
          className="w-[140px] border-stone-200 rounded-lg focus-visible:border-coral-400 focus-visible:ring-coral-500/20 focus-visible:ring-2"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
