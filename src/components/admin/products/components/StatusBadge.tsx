import type { ProductStatus } from '../types'

const styles: Record<ProductStatus, { bg: string; text: string; dot: string }> =
  {
    active: {
      bg: 'bg-emerald-500/5 border-emerald-500/10',
      text: 'text-emerald-600',
      dot: 'bg-emerald-500',
    },
    draft: {
      bg: 'bg-amber-500/5 border-amber-500/10',
      text: 'text-amber-600',
      dot: 'bg-amber-500',
    },
    archived: {
      bg: 'bg-muted/50 border-border',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
  }

export const StatusBadge = ({ status }: { status: ProductStatus }) => {
  const current = styles[status] || styles.draft

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${current.bg} border`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${current.text}`}
      >
        {status}
      </span>
    </div>
  )
}
