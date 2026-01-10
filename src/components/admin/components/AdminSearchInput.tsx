import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'

import { cn } from '../../../lib/utils'

export type AdminSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  /** If true, calls onChange on every keystroke. If false, only on form submit */
  submitOnChange?: boolean
  onSubmit?: () => void
  className?: string
}

export const AdminSearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel,
  submitOnChange = true,
  onSubmit,
  className,
}: AdminSearchInputProps) => {
  // For submit mode, track internal state
  const [internalValue, setInternalValue] = useState(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      if (submitOnChange) {
        onChange(newValue)
      } else {
        setInternalValue(newValue)
      }
    },
    [submitOnChange, onChange],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!submitOnChange) {
        onChange(internalValue)
      }
      onSubmit?.()
    },
    [submitOnChange, onChange, internalValue, onSubmit],
  )

  const handleClear = useCallback(() => {
    if (submitOnChange) {
      onChange('')
    } else {
      setInternalValue('')
      onChange('')
    }
  }, [submitOnChange, onChange])

  const displayValue = submitOnChange ? value : internalValue

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex-1', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-9 pl-10 pr-10 bg-white border border-stone-200 rounded-lg outline-none focus:border-coral-400 focus:ring-coral-500/20 focus:ring-2 transition-[color,box-shadow] text-sm placeholder:text-stone-400"
        aria-label={ariaLabel || placeholder}
      />
      {displayValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  )
}
