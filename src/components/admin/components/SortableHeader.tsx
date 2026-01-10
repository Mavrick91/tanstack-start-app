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
    <th className="text-left px-4 py-3">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-muted-foreground transition-colors group/header"
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
