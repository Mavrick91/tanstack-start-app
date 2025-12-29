import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { cn } from '../../lib/utils'

interface BackButtonProps {
  to: string
  params?: Record<string, string>
  label: string
  className?: string
}

export function BackButton({ to, params, label, className }: BackButtonProps) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        'inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors',
        className,
      )}
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  )
}
