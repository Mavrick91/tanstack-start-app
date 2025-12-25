import { createFileRoute, useRouter } from '@tanstack/react-router'

import { NewProductForm } from '../../../components/admin/products/NewProductForm'

export const Route = createFileRoute('/admin/products/new')({
  component: NewProductPage,
})

function NewProductPage() {
  const router = useRouter()

  const handleBack = () => {
    router.navigate({ to: '/admin/products' })
  }

  return (
    <div className="py-8 px-4 sm:px-0">
      <NewProductForm onBack={handleBack} />
    </div>
  )
}
