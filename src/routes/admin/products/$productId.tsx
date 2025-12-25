import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductEditForm } from '../../../components/admin/products/ProductEditForm'
import { Button } from '../../../components/ui/button'

import type { Product } from '../../../components/admin/products/ProductEditForm'

export const Route = createFileRoute('/admin/products/$productId')({
  component: EditProductPage,
})

function EditProductPage() {
  const { t } = useTranslation()
  const { productId } = Route.useParams()
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.product as Product
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500/20 border-t-pink-500" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Product...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-24 bg-card rounded-3xl border border-destructive/10 max-w-2xl mx-auto shadow-sm">
        <p className="text-destructive font-bold text-lg mb-2">
          {t('Failed to load product')}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('Check your connection or catalog access.')}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.navigate({ to: '/admin/products' })}
            className="gap-2 mb-2 hover:bg-pink-500/5 hover:text-pink-600 rounded-lg transition-all font-medium text-xs text-muted-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('Back to Products')}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {t('Edit Product')}
          </h1>
          <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest mt-1">
            ID: <span className="text-foreground">{productId}</span>
          </p>
        </div>
      </div>

      <ProductEditForm product={data} />
    </div>
  )
}
