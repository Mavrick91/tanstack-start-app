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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {description && <p className="text-stone-500 text-sm">{description}</p>}
      </div>
      {action && (
        <Link to={action.href}>
          <Button className="h-9 px-5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold gap-2">
            <ActionIcon className="w-4 h-4" />
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  )
}
