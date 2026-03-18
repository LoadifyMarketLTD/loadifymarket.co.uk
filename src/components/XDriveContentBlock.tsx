/**
 * XDriveContentBlock
 *
 * Reusable marketing copy block prepared for future placement on the XDrive Logistics site.
 * Currently used as a reference component only.
 *
 * Usage on XDrive Logistics site (future):
 *   <XDriveContentBlock />
 */
import { Link } from 'react-router-dom';
import { Store, ArrowRight, Package } from 'lucide-react';

interface XDriveContentBlockProps {
  className?: string;
}

export default function XDriveContentBlock({ className = '' }: XDriveContentBlockProps) {
  return (
    <div className={`card-glass border border-gold/20 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 rounded-premium-sm bg-gold/10 flex-shrink-0">
          <Package className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Need Stock, Pallets or Wholesale Deals?
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Browse Loadify Market to find pallet deals, wholesale stock, and marketplace listings
            across the UK.
          </p>
        </div>
      </div>
      <Link
        to="/"
        className="btn-secondary inline-flex items-center gap-2 text-sm"
      >
        <Store className="w-4 h-4" />
        Visit Loadify Market
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
