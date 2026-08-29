import { ShieldCheck, Star, MapPin, Package, ArrowRight, CalendarDays, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="overflow-hidden rounded-2xl border border-[#DCE3ED] bg-white shadow-[0_12px_30px_rgba(15,35,70,0.06)]">
      <div className="border-b border-[#E7ECF3] bg-[#0A234F] px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5A300]">Marketplace seller</p>
            <h3 className="mt-1 font-display text-sm font-bold">Sold by {name}</h3>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Store className="h-4 w-4 text-[#F5A300]" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5A300] font-display text-sm font-bold text-[#0A234F]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-sm font-bold text-[#0A234F]">{name}</p>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> Verified seller
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Independent seller</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2">
            <Package className="h-3.5 w-3.5 text-[#1F5BD8]" />
            <span>{totalListings} {totalListings === 1 ? "listing" : "listings"}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2">
            <Star className="h-3.5 w-3.5 fill-[#F5A300] text-[#F5A300]" />
            <span>{rating > 0 ? rating : "No ratings yet"}</span>
          </div>
          {location && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2">
              <MapPin className="h-3.5 w-3.5 text-[#1F5BD8]" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {joinYear && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2">
              <CalendarDays className="h-3.5 w-3.5 text-[#1F5BD8]" />
              <span>Joined {joinYear}</span>
            </div>
          )}
        </div>

        {storeSlug && (
          <Link to={`/seller/${storeSlug}`} className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#D6DFEB] font-semibold text-[#0A234F] hover:border-[#1F5BD8]/40 hover:bg-[#F8FAFC]"
            >
              View storefront <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default SellerCard;
