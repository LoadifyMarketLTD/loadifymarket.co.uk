import { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

/**
 * ProductGallery — main image + thumbnail strip with a full-screen lightbox.
 * Handles keyboard navigation (ArrowLeft / ArrowRight / Escape).
 */
export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const imgs = images.length > 0 ? images : ['/placeholder-product.png'];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setActive((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setActive((i) => (i + 1) % imgs.length);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') setLightbox(false);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <div className="relative group rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square md:aspect-[4/3]">
          <img
            src={imgs[active]}
            alt={`${productName} — image ${active + 1}`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />

          {/* Arrows */}
          {imgs.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-800" />
              </button>
              <button
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5 text-gray-800" />
              </button>
            </>
          )}

          {/* Zoom button */}
          <button
            onClick={() => setLightbox(true)}
            aria-label="View full-size image"
            className="absolute bottom-3 right-3 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-opacity opacity-0 group-hover:opacity-100"
          >
            <ZoomIn className="h-4 w-4 text-gray-800" />
          </button>

          {/* Image counter badge */}
          {imgs.length > 1 && (
            <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {active + 1} / {imgs.length}
            </span>
          )}
        </div>

        {/* Thumbnails */}
        {imgs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imgs.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === active
                    ? 'border-[#0A2239]'
                    : 'border-transparent hover:border-gray-300'
                }`}
                aria-label={`View image ${idx + 1}`}
                aria-pressed={idx === active}
              >
                <img
                  src={src}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
          onKeyDown={handleKey}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imgs[active]}
              alt={`${productName} — image ${active + 1}`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />

            {imgs.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-3"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-4 -right-4 bg-white rounded-full p-1.5 shadow"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5 text-gray-800" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
