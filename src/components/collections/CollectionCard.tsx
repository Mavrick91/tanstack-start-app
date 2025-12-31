import { Link, useParams } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CollectionThumbnail } from './CollectionThumbnail'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter } from '../ui/card'

type CollectionCardProps = {
  collection: {
    id: string
    handle: string
    name: string
    previewImages?: string[]
    productCount: number
  }
}

export const CollectionCard = ({ collection }: CollectionCardProps) => {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const { t } = useTranslation()
  const currentLang = lang || 'en'

  return (
    <Card className="group overflow-hidden border-none bg-transparent shadow-none transition-all duration-500 hover:translate-y-[-4px]">
      <CardContent className="p-0 relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/30">
        <Link
          to="/$lang/collections/$handle"
          params={{ lang: currentLang, handle: collection.handle }}
          className="block w-full h-full"
        >
          <CollectionThumbnail
            images={collection.previewImages || []}
            className="w-full h-full"
          />
        </Link>

        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full transition-transform duration-500 group-hover:translate-y-0 bg-gradient-to-t from-black/60 to-transparent">
          <Link
            to="/$lang/collections/$handle"
            params={{ lang: currentLang, handle: collection.handle }}
            className="w-full"
          >
            <Button className="w-full glass-dark text-white border-white/20 hover:bg-white/10">
              {t('View Collection')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>

      <CardFooter className="px-0 py-4 flex flex-col items-start gap-1">
        <Link
          to="/$lang/collections/$handle"
          params={{ lang: currentLang, handle: collection.handle }}
          className="text-sm font-semibold tracking-tight hover:underline underline-offset-4"
        >
          {collection.name}
        </Link>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {collection.productCount} {t('Products')}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
