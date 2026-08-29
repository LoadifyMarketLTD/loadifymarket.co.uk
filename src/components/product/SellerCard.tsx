import { ShieldCheck, Star, MapPin, Package, ArrowUpRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

interface SellerCardProps {
  name: string;
  verified: boolean;
  rating: number;
  location: string;
  totalListings: number;
  /** The seller's store slug — used to link to the public seller profile page */
  storeSlug?: string | null;
  /** ISO date string for when the seller joined */
  joinDate?: string | null;
}

const SellerCard = ({ name, verified, rating, location, totalListings, storeSlug, joinDate }: SellerCardProps) => {
  const joinYear = joinDate ? new Date(joinDate).getFullYear() : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1E6EC] bg-[#FEFEFD] shadow-[0_10px_28px_rgba(10,35,79,0.045)]">
      <div className="h-1 bg-[#0A234F]" />

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#7A8492]">Marketplace seller</p>
            <h3 className="mt-1 font-display text-sm font-bold text-[#0A234F]">Sold by {name}</h3>
          </div>
          {verified && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D7E0E9] bg-[#F5F7FA] px-2 py-1 text-[9px] font-semibold text-[#3E5B78]">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 border-y border-[#EBEEF2] py-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A234F] font-display text-sm font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-[#0A234F]">{name}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7A8492]">Independent seller</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] text-[#667384]">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-[#667384]" />
            <span>{totalListings} {totalListings === 1 ? "listing" : "listings"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-[#8B6B26]" />
            <span>{rating > 0 ? rating : "No ratings yet"}</span>
          </div>
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#667384]" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {joinYear && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[#667384]" />
              <span>Joined {joinYear}</span>
            </div>
          )}
        </div>

        {storeSlug && (
          <Link
            to={`/seller/${storeSlug}`}
            className="flex items-center justify-between border-t border-[#EBEEF2] pt-3 text-[12px] font-semibold text-[#0A234F] transition-colors hover:text-[#1D57D8]"
          >
            <span>View storefront</span>
            <ArrowUpRight className="h-4 w-4 text-[#8B6B26]" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default SellerCard;
