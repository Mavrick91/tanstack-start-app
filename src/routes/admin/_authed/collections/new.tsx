import { createFileRoute } from '@tanstack/react-router'

import { CollectionForm } from '../../../../components/admin/collections/CollectionForm'

const NewCollectionPage = () => {
  return <CollectionForm isEdit={false} />
}

export const Route = createFileRoute('/admin/_authed/collections/new')({
  component: NewCollectionPage,
})
