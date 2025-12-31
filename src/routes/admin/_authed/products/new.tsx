import { createFileRoute, useRouter } from '@tanstack/react-router'

import { ProductForm } from '../../../../components/admin/products/ProductForm'

const NewProductPage = (): React.ReactNode => {
  const router = useRouter()

  const handleBack = (): void => {
    router.navigate({ to: '/admin/products' })
  }

  return (
    <div className="px-4 sm:px-0">
      <ProductForm onBack={handleBack} />
    </div>
  )
}

export const Route = createFileRoute('/admin/_authed/products/new')({
  component: NewProductPage,
})
