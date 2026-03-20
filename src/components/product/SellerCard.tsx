import { Link } from 'react-router-dom';
import { BadgeCheck, Star, Store, MapPin, ExternalLink } from 'lucide-react';

interface SellerCardProps {
  sellerId: string;
  storeName: string;
  storeSlug?: string | null;
  businessName?: string;
  isVerified?: boolean;
  rating?: number;
  totalReviews?: number;
  location?: string;
  memberSince?: string;
  avatarUrl?: string;
}

/**
 * SellerCard — compact seller information card displayed on the product detail
 * page.  Links to the seller's public profile page.
 */
export default function SellerCard({
  sellerId,
  storeName,
  storeSlug,
  businessName,
  isVerified,
  rating,
  totalReviews,
  location,
  memberSince,
  avatarUrl,
}: SellerCardProps) {
  const profileHref = storeSlug
    ? `/seller/${storeSlug}`
    : `/seller/${sellerId}`;

  const displayName = storeName || businessName || 'Unknown Seller';

  return (
    <div className="rounded-2xl border border-gray-200 p-5 bg-[#FAFAFA]">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Sold by
      </h3>

      <div className="flex items-start gap-3">
        {/* Avatar / icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0A2239]/10 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Store className="w-6 h-6 text-[#0A2239]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Store name */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileHref}
              className="text-sm font-bold text-gray-900 hover:text-[#0A2239] transition-colors truncate"
            >
              {displayName}
            </Link>
            {isVerified && (
              <BadgeCheck
                className="h-4 w-4 text-[#0A2239] flex-shrink-0"
                aria-label="Verified seller"
              />
            )}
          </div>

          {/* Rating */}
          {typeof rating === 'number' && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3.5 w-3.5 text-[#D4AF37] fill-[#D4AF37]" />
              <span className="text-xs font-semibold text-gray-700">
                {rating.toFixed(1)}
              </span>
              {typeof totalReviews === 'number' && (
                <span className="text-xs text-gray-400">
                  ({totalReviews.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{location}</span>
            </div>
          )}

          {/* Member since */}
          {memberSince && (
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        to={profileHref}
        className="mt-4 flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-[#0A2239] border border-[#0A2239] rounded-lg py-2 hover:bg-[#0A2239] hover:text-white transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View Seller Profile
      </Link>
    </div>
  );
}
