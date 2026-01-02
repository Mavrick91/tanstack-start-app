import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'

import type { Collection, CollectionFormValues } from '../types'

const generateHandle = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface UseCollectionFormOptions {
  collection?: Collection
  isEdit: boolean
  onSubmit: (values: CollectionFormValues) => void
}

export const useCollectionForm = ({
  collection,
  isEdit,
  onSubmit,
}: UseCollectionFormOptions) => {
  const form = useForm({
    defaultValues: {
      nameEn: collection?.name?.en || '',
      nameFr: collection?.name?.fr || '',
      nameId: collection?.name?.id || '',
      handle: collection?.handle || '',
      descriptionEn: collection?.description?.en || '',
      descriptionFr: collection?.description?.fr || '',
      descriptionId: collection?.description?.id || '',

      metaTitleEn: collection?.metaTitle?.en || '',
      metaTitleFr: collection?.metaTitle?.fr || '',
      metaTitleId: collection?.metaTitle?.id || '',
      metaDescriptionEn: collection?.metaDescription?.en || '',
      metaDescriptionFr: collection?.metaDescription?.fr || '',
      metaDescriptionId: collection?.metaDescription?.id || '',
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  const handleNameChange = (val: string) => {
    const previousNameEn = form.getFieldValue('nameEn')
    form.setFieldValue('nameEn', val)

    // Auto-generate handle in create mode if not manually set
    if (
      !isEdit &&
      (!form.getFieldValue('handle') ||
        form.getFieldValue('handle') === generateHandle(previousNameEn))
    ) {
      form.setFieldValue('handle', generateHandle(val))
    }

    // Sync SEO Title if not manually set
    if (
      !form.getFieldValue('metaTitleEn') ||
      form.getFieldValue('metaTitleEn') === previousNameEn
    ) {
      form.setFieldValue('metaTitleEn', val)
    }
  }

  // Track dirty state for unsaved changes warning
  const isDirty = useStore(form.store, (state) => state.isDirty)

  return {
    form,
    handleNameChange,
    isDirty,
  }
}

export { generateHandle }
