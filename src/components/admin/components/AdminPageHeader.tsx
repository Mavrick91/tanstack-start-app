import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '../../ui/button'

import type { LucideIcon } from 'lucide-react'

export type AdminPageHeaderProps = {
  title: string
  description?: string
  action?: {
    label: string
    href: string
    icon?: LucideIcon
  }
}

export const AdminPageHeader = ({
  title,
  description,
  action,
}: AdminPageHeaderProps) => {
  const ActionIcon = action?.icon || Plus

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action && (
        <Link to={action.href}>
          <Button className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-sm font-semibold gap-2 transition-all">
            <ActionIcon className="w-4 h-4" />
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  )
}
