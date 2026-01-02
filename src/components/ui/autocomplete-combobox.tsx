import { Check, ChevronDown } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { Input } from './input'

import { cn } from '@/lib/utils'

export interface AutocompleteComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  id?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  allowCustom?: boolean
}

export const AutocompleteCombobox = ({
  value,
  onChange,
  suggestions,
  placeholder,
  id,
  className,
  inputClassName,
  disabled = false,
  allowCustom = true,
}: AutocompleteComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return suggestions
    const lower = inputValue.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(lower))
  }, [inputValue, suggestions])

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setIsOpen(true)
      setHighlightedIndex(-1)
      if (allowCustom) {
        onChange(newValue)
      }
    },
    [allowCustom, onChange],
  )

  // Handle selecting a suggestion
  const handleSelect = useCallback(
    (suggestion: string) => {
      setInputValue(suggestion)
      onChange(suggestion)
      setIsOpen(false)
      setHighlightedIndex(-1)
      inputRef.current?.focus()
    },
    [onChange],
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true)
          e.preventDefault()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (
            highlightedIndex >= 0 &&
            highlightedIndex < filteredSuggestions.length
          ) {
            handleSelect(filteredSuggestions[highlightedIndex])
          } else if (allowCustom) {
            setIsOpen(false)
          }
          break
        case 'Escape':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
        case 'Tab':
          setIsOpen(false)
          break
      }
    },
    [isOpen, filteredSuggestions, highlightedIndex, handleSelect, allowCustom],
  )

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li')
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update dropdown position when open
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [isOpen])

  const showDropdown = isOpen && filteredSuggestions.length > 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pr-8', inputClassName)}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            inputRef.current?.focus()
          }}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label="Toggle suggestions"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              showDropdown && 'rotate-180',
            )}
          />
        </button>
      </div>

      {showDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={dropdownStyle}
            className="max-h-60 overflow-auto rounded-md border border-border/50 bg-popover p-1 shadow-md"
          >
            {filteredSuggestions.map((suggestion, index) => {
              const isHighlighted = index === highlightedIndex
              const isSelected =
                suggestion.toLowerCase() === inputValue.toLowerCase()

              return (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    isHighlighted && 'bg-muted',
                    isSelected && 'font-medium',
                  )}
                >
                  <span>{suggestion}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                  )}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
