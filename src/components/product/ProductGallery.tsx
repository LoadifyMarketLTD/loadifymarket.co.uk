import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { productHero, productThumbnail } from "@/lib/imageOptimization";
import NativeImg from "@/components/NativeImg";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

const ProductGallery = ({ images, title }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const showPrevious = () => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const showNext = () => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  useEffect(() => {
    if (!viewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (images.length > 1 && event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (images.length > 1 && event.key === "ArrowRight") {
        setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerOpen, images.length]);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="absolute inset-0 z-0 block h-full w-full cursor-zoom-in"
          aria-label={`Open full image ${activeIndex + 1} of ${images.length}`}
        >
          <NativeImg
            src={productHero(images[activeIndex])}
            alt={title}
            className="w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
          />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#0A234F]/95 border border-white/80 items-center justify-center text-white shadow-lg hover:bg-[#0A234F] transition-colors" aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#0A234F]/95 border border-white/80 items-center justify-center text-white shadow-lg hover:bg-[#0A234F] transition-colors" aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-3 right-3 z-10 block bg-[#0A234F]/95 text-sm font-bold text-white px-3 py-1.5 rounded-full border border-white/80 shadow-lg">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                i === activeIndex ? "border-primary ring-1 ring-primary/30" : "border-border opacity-60 hover:opacity-100"
              }`}
            >
              <NativeImg src={productThumbnail(img)} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#071426]/95 p-3" role="dialog" aria-modal="true" aria-label={`${title} image viewer`}>
          <button type="button" onClick={() => setViewerOpen(false)} className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-[#0A234F]/95 text-white shadow-xl" aria-label="Close image viewer">
            <X className="h-6 w-6" />
          </button>
          <div className="relative flex h-full w-full items-center justify-center">
            <NativeImg src={images[activeIndex]} alt={`${title}, image ${activeIndex + 1}`} className="max-h-full max-w-full object-contain" loading="eager" fetchPriority="high" />
            {images.length > 1 && (
              <>
                <button type="button" onClick={showPrevious} className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-[#0A234F]/95 text-white shadow-xl" aria-label="Previous image">
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button type="button" onClick={showNext} className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-[#0A234F]/95 text-white shadow-xl" aria-label="Next image">
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
            <div className="absolute bottom-4 right-4 z-10 rounded-full border border-white/80 bg-[#0A234F]/95 px-3 py-1.5 text-sm font-bold text-white shadow-xl">{activeIndex + 1} / {images.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
