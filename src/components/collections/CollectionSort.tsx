import { useRouter } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface CollectionSortProps {
  currentSort?: string
}

export const CollectionSort = ({
  currentSort = 'manual',
}: CollectionSortProps) => {
  const { t } = useTranslation()
  const router = useRouter()

  const sortOptions = [
    { label: t('Featured'), value: 'manual' },
    { label: t('Newest'), value: 'newest' },
    { label: t('Price: Low to High'), value: 'price_asc' },
    { label: t('Price: High to Low'), value: 'price_desc' },
  ]

  const currentOption =
    sortOptions.find((opt) => opt.value === currentSort) || sortOptions[0]

  const handleSortChange = (value: string) => {
    router.navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, sort: value }),
    } as Parameters<typeof router.navigate>[0])
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
        {t('Sort by')}:
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 flex items-center gap-2 min-w-[160px] justify-between"
          >
            <span className="truncate">{currentOption.label}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={option.value === currentSort ? 'bg-muted' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
