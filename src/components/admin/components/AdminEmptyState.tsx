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
    <div className="text-center py-12 bg-white border border-stone-200 rounded-2xl shadow-sm">
      <div className="w-14 h-14 bg-coral-50 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-coral-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-1">{title}</h3>
      <p className="text-stone-500 text-sm mb-5 max-w-xs mx-auto">
        {description}
      </p>
      <Link to={actionHref}>
        <Button className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl h-9 px-5 font-medium">
          {actionLabel}
        </Button>
      </Link>
    </div>
  )
}
