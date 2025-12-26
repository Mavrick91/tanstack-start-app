export type LocalizedString = { en: string; fr?: string; id?: string }

export interface Product {
  id: string
  handle: string
  name: string | LocalizedString
  image: string | null
}

export interface Collection {
  id: string
  handle: string
  name: LocalizedString
  description?: LocalizedString
  imageUrl?: string
  metaTitle?: LocalizedString
  metaDescription?: LocalizedString
  publishedAt: string | Date | null
  createdAt: string | Date
  products?: Product[]
}

export interface CollectionFormProps {
  collection?: Collection
  isEdit?: boolean
}

export interface CollectionFormValues {
  nameEn: string
  nameFr: string
  nameId: string
  handle: string
  descriptionEn: string
  descriptionFr: string
  descriptionId: string
  imageUrl: string
  metaTitleEn: string
  metaTitleFr: string
  metaTitleId: string
  metaDescriptionEn: string
  metaDescriptionFr: string
  metaDescriptionId: string
}
