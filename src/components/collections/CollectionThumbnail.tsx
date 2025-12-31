import { Image } from 'lucide-react'

import { cn } from '../../lib/utils'

interface CollectionThumbnailProps {
  images: (string | null | undefined)[]
  className?: string
}

export const CollectionThumbnail = ({
  images,
  className,
}: CollectionThumbnailProps) => {
  const validImages = images.filter((img): img is string => !!img).slice(0, 4)
  const count = validImages.length

  if (count === 0) {
    return (
      <div
        className={cn(
          'h-full w-full bg-muted/50 flex items-center justify-center text-muted-foreground/30',
          className,
        )}
      >
        <Image className="h-1/3 w-1/3" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-background',
        className,
      )}
    >
      {validImages.map((src, i) => (
        <img key={i} src={src} alt="" className="h-full w-full object-cover" />
      ))}
      {Array.from({ length: 4 - count }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="flex items-center justify-center bg-muted/30"
        >
          <Image className="h-8 w-8 opacity-20" />
        </div>
      ))}
    </div>
  )
}
