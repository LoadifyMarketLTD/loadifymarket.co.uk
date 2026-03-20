import { ShieldCheck, Star, MapPin, Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface SellerCardProps {
  name: string;
  verified: boolean;
  rating: number;
  location: string;
  totalListings: number;
}

const SellerCard = ({ name, verified, rating, location, totalListings }: SellerCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Seller Information</h3>
        {verified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-foreground">{name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-accent text-accent" />
              {rating}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        {totalListings} active listings
      </div>

      <Link to={`/catalog?seller=${encodeURIComponent(name)}`}>
        <Button variant="outline" size="sm" className="w-full text-sm">
          View Seller Profile <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
};

export default SellerCard;
