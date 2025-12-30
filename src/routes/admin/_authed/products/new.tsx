import { createFileRoute, useRouter } from '@tanstack/react-router'

import { ProductForm } from '../../../../components/admin/products/ProductForm'

export const Route = createFileRoute('/admin/_authed/products/new')({
  component: NewProductPage,
})

function NewProductPage() {
  const router = useRouter()

  const handleBack = () => {
    router.navigate({ to: '/admin/products' })
  }

  return (
    <div className="px-4 sm:px-0">
      <ProductForm onBack={handleBack} />
    </div>
  )
}
