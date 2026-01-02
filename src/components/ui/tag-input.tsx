import { X } from 'lucide-react'
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

import { cn } from '@/lib/utils'

import { Badge } from './badge'

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Filter suggestions that aren't already selected and match input
  const filteredSuggestions = useMemo(() => {
    const valueLower = value.map((v) => v.toLowerCase())
    return suggestions.filter((s) => {
      const lower = s.toLowerCase()
      return (
        !valueLower.includes(lower) &&
        (inputValue.trim() === '' || lower.includes(inputValue.toLowerCase()))
      )
    })
  }, [inputValue, suggestions, value])

  // Add a tag
  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (trimmed && !value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
        onChange([...value, trimmed])
      }
      setInputValue('')
      setHighlightedIndex(-1)
      inputRef.current?.focus()
    },
    [onChange, value],
  )

  // Remove a tag
  const removeTag = useCallback(
    (index: number) => {
      const newTags = value.filter((_, i) => i !== index)
      onChange(newTags)
    },
    [onChange, value],
  )

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setIsOpen(true)
      setHighlightedIndex(-1)
    },
    [],
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        removeTag(value.length - 1)
        return
      }

      if (!isOpen && filteredSuggestions.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true)
          e.preventDefault()
          return
        }
      }

      switch (e.key) {
        case 'Enter':
        case ',':
          e.preventDefault()
          if (
            highlightedIndex >= 0 &&
            highlightedIndex < filteredSuggestions.length
          ) {
            addTag(filteredSuggestions[highlightedIndex])
          } else if (inputValue.trim()) {
            addTag(inputValue)
          }
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
            )
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          }
          break
        case 'Escape':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
        case 'Tab':
          if (inputValue.trim()) {
            addTag(inputValue)
          }
          setIsOpen(false)
          break
      }
    },
    [
      inputValue,
      value,
      isOpen,
      filteredSuggestions,
      highlightedIndex,
      addTag,
      removeTag,
    ],
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
        // Also add any pending input as tag
        if (inputValue.trim()) {
          addTag(inputValue)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputValue, addTag])

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
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[44px] p-2 bg-background/50 border border-border/50 rounded-xl focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500/50 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="gap-1 pl-2.5 pr-1 py-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 hover:bg-pink-500/20"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              disabled={disabled}
              className="p-0.5 rounded-full hover:bg-pink-500/30 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {showDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={dropdownStyle}
            className="max-h-48 overflow-auto rounded-xl border border-border/50 bg-popover p-1 shadow-lg"
          >
            {filteredSuggestions.map((suggestion, index) => {
              const isHighlighted = index === highlightedIndex

              return (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => {
                    addTag(suggestion)
                    setIsOpen(false)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    isHighlighted && 'bg-muted',
                  )}
                >
                  {suggestion}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
