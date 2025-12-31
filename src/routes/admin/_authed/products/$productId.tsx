import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  ProductForm,
  type Product,
} from '../../../../components/admin/products/ProductForm'
import { getProductByIdFn } from '../../../../server/products'

const EditProductPage = () => {
  const { t } = useTranslation()
  const { productId } = Route.useParams()
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const result = await getProductByIdFn({ data: { productId } })
      return result.product as Product
    },
  })

  const handleBack = () => {
    router.navigate({ to: '/admin/products' })
  }

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
    <div className="px-4 sm:px-0">
      <ProductForm product={data} onBack={handleBack} />
    </div>
  )
}

export const Route = createFileRoute('/admin/_authed/products/$productId')({
  component: EditProductPage,
})
