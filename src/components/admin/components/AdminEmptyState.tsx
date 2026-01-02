import { Link } from '@tanstack/react-router'

import { Button } from '../../ui/button'

import type { LucideIcon } from 'lucide-react'

export interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  actionHref: string
}

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: AdminEmptyStateProps) => {
  return (
    <div className="text-center py-12 bg-card border border-border rounded-lg">
      <div className="w-14 h-14 bg-pink-500/5 rounded-md flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-pink-500/40" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">
        {description}
      </p>
      <Link to={actionHref}>
        <Button variant="outline" className="rounded-md h-9 px-5 font-semibold">
          {actionLabel}
        </Button>
      </Link>
    </div>
  )
}
