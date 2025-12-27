import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  addProductsToCollectionFn,
  createCollectionFn,
  duplicateCollectionFn,
  publishCollectionFn,
  removeProductFromCollectionFn,
  reorderCollectionProductsFn,
  unpublishCollectionFn,
  updateCollectionFn,
} from '../../../../server/collections'

import type {
  Collection,
  CollectionFormValues,
  LocalizedString,
  Product,
} from '../types'

interface UseCollectionMutationsOptions {
  collection?: Collection
  isEdit: boolean
  allProducts: Product[]
  onProductsAdded: (products: Product[]) => void
  onProductRemoved: (productId: string) => void
  onPickerClose: () => void
  onSelectionReset: () => void
}

export function useCollectionMutations({
  collection,
  isEdit,
  allProducts,
  onProductsAdded,
  onProductRemoved,
  onPickerClose,
  onSelectionReset,
}: UseCollectionMutationsOptions) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const collectionId = collection?.id

  const invalidateCollection = () => {
    if (collectionId) {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
    }
  }

  const invalidateCollections = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
  }

  const handleError = (error: Error) => {
    toast.error(error.message)
  }

  const save = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      const name: LocalizedString = { en: values.nameEn }
      if (values.nameFr) name.fr = values.nameFr
      if (values.nameId) name.id = values.nameId

      const description: LocalizedString = { en: values.descriptionEn }
      if (values.descriptionFr) description.fr = values.descriptionFr
      if (values.descriptionId) description.id = values.descriptionId

      const metaTitle: LocalizedString = { en: values.metaTitleEn }
      if (values.metaTitleFr) metaTitle.fr = values.metaTitleFr
      if (values.metaTitleId) metaTitle.id = values.metaTitleId

      const metaDescription: LocalizedString = { en: values.metaDescriptionEn }
      if (values.metaDescriptionFr)
        metaDescription.fr = values.metaDescriptionFr
      if (values.metaDescriptionId)
        metaDescription.id = values.metaDescriptionId

      const payload = {
        name,
        handle: values.handle,
        description: values.descriptionEn ? description : undefined,
        metaTitle: values.metaTitleEn ? metaTitle : undefined,
        metaDescription: values.metaDescriptionEn ? metaDescription : undefined,
      }

      if (isEdit && collectionId) {
        return updateCollectionFn({ data: { id: collectionId, ...payload } })
      } else {
        return createCollectionFn({ data: payload })
      }
    },
    onSuccess: (result) => {
      invalidateCollections()
      if (isEdit) {
        invalidateCollection()
        toast.success(t('Collection updated'))
      } else {
        toast.success(t('Collection created'))
        navigate({
          to: '/admin/collections/$collectionId',
          params: { collectionId: result.data.id },
        })
      }
    },
    onError: handleError,
  })

  const addProducts = useMutation({
    mutationFn: (ids: string[]) => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return addProductsToCollectionFn({
        data: { collectionId, productIds: ids },
      })
    },
    onSuccess: (_result, addedIds) => {
      const addedProducts = allProducts.filter((p) => addedIds.includes(p.id))
      onProductsAdded(addedProducts)
      invalidateCollection()
      onPickerClose()
      onSelectionReset()
      toast.success(t('Products added'))
    },
    onError: handleError,
  })

  const removeProduct = useMutation({
    mutationFn: (productId: string) => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return removeProductFromCollectionFn({
        data: { collectionId, productId },
      })
    },
    onSuccess: (_result, removedProductId) => {
      onProductRemoved(removedProductId)
      invalidateCollection()
      toast.success(t('Product removed'))
    },
    onError: handleError,
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return reorderCollectionProductsFn({
        data: { collectionId, productIds: ids },
      })
    },
    onSuccess: () => {
      invalidateCollection()
    },
    onError: handleError,
  })

  const publish = useMutation({
    mutationFn: () => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return publishCollectionFn({ data: { id: collectionId } })
    },
    onSuccess: () => {
      invalidateCollection()
      toast.success(t('Collection published'))
    },
    onError: handleError,
  })

  const unpublish = useMutation({
    mutationFn: () => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return unpublishCollectionFn({ data: { id: collectionId } })
    },
    onSuccess: () => {
      invalidateCollection()
      toast.success(t('Collection unpublished'))
    },
    onError: handleError,
  })

  const duplicate = useMutation({
    mutationFn: () => {
      if (!collectionId) throw new Error('Collection ID is missing')
      return duplicateCollectionFn({ data: { id: collectionId } })
    },
    onSuccess: (result) => {
      invalidateCollections()
      toast.success(t('Collection duplicated'))
      navigate({
        to: '/admin/collections/$collectionId',
        params: { collectionId: result.data.id },
      })
    },
    onError: handleError,
  })

  return {
    save,
    addProducts,
    removeProduct,
    reorder,
    publish,
    unpublish,
    duplicate,
  }
}
