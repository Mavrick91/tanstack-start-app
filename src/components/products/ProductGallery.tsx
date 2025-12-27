import { Fancybox } from '@fancyapps/ui'
import '@fancyapps/ui/dist/fancybox/fancybox.css'
import { useEffect } from 'react'

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    Fancybox.bind('[data-fancybox="gallery"]')

    return () => {
      Fancybox.destroy()
    }
  }, [])

  if (!images || images.length === 0) return null

  return (
    <div className="space-y-4">
      <a
        href={images[0]}
        data-fancybox="gallery"
        data-caption={productName}
        className="block aspect-[4/5] rounded-3xl overflow-hidden bg-secondary/30 cursor-zoom-in group"
      >
        <img
          src={images[0]}
          alt={productName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </a>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.slice(1).map((img, i) => (
            <a
              key={i}
              href={img}
              data-fancybox="gallery"
              className="aspect-square rounded-xl overflow-hidden bg-secondary/30 cursor-zoom-in group"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
