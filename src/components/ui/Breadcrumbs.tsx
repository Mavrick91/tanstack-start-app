import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../lib/utils'

interface BreadcrumbItem {
  label: string
  to?: string
  params?: Record<string, string>
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  lang: string
}

export function Breadcrumbs({ items, className, lang }: BreadcrumbsProps) {
  const { t } = useTranslation()

  return (
    <nav
      className={cn(
        'flex items-center space-x-1 text-xs text-muted-foreground',
        className,
      )}
      aria-label="Breadcrumb"
    >
      <Link
        to="/$lang"
        params={{ lang }}
        className="hover:text-foreground transition-colors flex items-center"
      >
        <Home className="h-3 w-3" />
        <span className="sr-only">{t('Home')}</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {item.to ? (
            <Link
              to={item.to as '.'}
              params={item.params as Record<string, string>}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
