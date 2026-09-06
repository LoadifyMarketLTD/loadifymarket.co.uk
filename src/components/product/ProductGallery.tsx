import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { productHero, productThumbnail } from "@/lib/imageOptimization";
import NativeImg from "@/components/NativeImg";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

const ProductGallery = ({ images, title }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);


  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border">
        <NativeImg
          src={productHero(images[activeIndex])}
          alt={title}
          className="w-full h-full object-cover"
          fetchPriority="high"
          loading="eager"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#0A234F]/95 border border-white/80 items-center justify-center text-white shadow-lg hover:bg-[#0A234F] transition-colors" aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#0A234F]/95 border border-white/80 items-center justify-center text-white shadow-lg hover:bg-[#0A234F] transition-colors" aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-3 right-3 block bg-[#0A234F]/95 text-sm font-bold text-white px-3 py-1.5 rounded-full border border-white/80 shadow-lg">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
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
    </div>
  );
};

export default ProductGallery;
