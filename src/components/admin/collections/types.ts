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
  publishedAt: Date | null
  createdAt: Date
  products?: Product[]
}

export interface CollectionListItem {
  id: string
  handle: string
  name: LocalizedString
  imageUrl: string | null
  sortOrder: string | null
  publishedAt: Date | null
  createdAt: Date
  productCount: number
  previewImages: string[]
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
