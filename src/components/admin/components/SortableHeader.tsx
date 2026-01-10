import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export type SortOrder = 'asc' | 'desc'

export type SortableHeaderProps<T extends string> = {
  label: string
  sortKey: T
  currentSortKey: T
  sortOrder: SortOrder
  onSort: (key: T) => void
}

export const SortableHeader = <T extends string>({
  label,
  sortKey,
  currentSortKey,
  sortOrder,
  onSort,
}: SortableHeaderProps<T>) => {
  const isActive = sortKey === currentSortKey

  return (
    <th className="text-left px-6 py-3 bg-stone-50">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors group/header"
      >
        {label}
        <span className="w-3.5 h-3.5">
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-coral-500" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-coral-500" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-50 transition-opacity" />
          )}
        </span>
      </button>
    </th>
  )
}
