import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) => {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const start = (currentPage - 1) * 10 + 1
  const end = Math.min(currentPage * 10, totalItems)

  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <p className="text-xs text-muted-foreground">
        {t('Showing {{start}}–{{end}} of {{total}}', {
          start,
          end,
          total: totalItems,
        })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === totalPages ||
              (p >= currentPage - 1 && p <= currentPage + 1),
          )
          .map((page, idx, arr) => {
            const prev = arr[idx - 1]
            const showEllipsis = prev && page - prev > 1

            return (
              <div key={page} className="flex items-center">
                {showEllipsis && (
                  <span className="px-2 text-muted-foreground">…</span>
                )}
                <Button
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="icon"
                  className={`h-8 w-8 rounded-lg ${page === currentPage ? 'bg-pink-500 hover:bg-pink-600 text-white' : ''}`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              </div>
            )
          })}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
