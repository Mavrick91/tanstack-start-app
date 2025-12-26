import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CollectionForm } from '../../../components/admin/collections/CollectionForm'
import { Button } from '../../../components/ui/button'
import { getCollectionFn } from '../../../server/collections'

export const Route = createFileRoute('/admin/collections/$collectionId')({
  component: EditCollectionPage,
})

function EditCollectionPage() {
  const { t } = useTranslation()
  const { collectionId } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => getCollectionFn({ data: { id: collectionId } }),
  })

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500/20 border-t-pink-500" />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">{t('Collection not found')}</h2>
        <Button asChild>
          <Link to="/admin/collections">{t('Back to Collections')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <CollectionForm
      collection={{
        ...data.data,
        description: data.data.description || undefined,
        imageUrl: data.data.imageUrl || undefined,
        metaTitle: data.data.metaTitle || undefined,
        metaDescription: data.data.metaDescription || undefined,
      }}
      isEdit={true}
    />
  )
}
