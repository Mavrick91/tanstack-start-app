import { FolderOpen } from 'lucide-react'

import { cn } from '../../../../lib/utils'

interface CollectionThumbnailProps {
  images: (string | null | undefined)[]
  className?: string
}

export function CollectionThumbnail({
  images,
  className,
}: CollectionThumbnailProps) {
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
        <FolderOpen className="h-1/3 w-1/3" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-full w-full overflow-hidden bg-background',
        count >= 4 ? 'grid grid-cols-2 grid-rows-2 gap-0.5' : 'relative',
        className,
      )}
    >
      {count >= 4 ? (
        validImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-full w-full object-cover"
          />
        ))
      ) : // For < 4 images, just show the first one as a cover for now,
      // or a simple grid with empty slots?
      // User asked for "grid 2x2", implying even if incomplete?
      // Let's do a smart fallback: 1 giant image if < 4?
      // "take the 4 first image ... and display them in a grid 2x2"
      // If we have 2, maybe 2 side by side?
      // Let's stick to 2x2 grid for consistency if > 1, else full.
      count === 1 ? (
        <img
          src={validImages[0]}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full w-full">
          {validImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-full w-full object-cover"
            />
          ))}
          {/* Fill remaining slots with muted background */}
          {Array.from({ length: 4 - count }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-muted/30" />
          ))}
        </div>
      )}
    </div>
  )
}
