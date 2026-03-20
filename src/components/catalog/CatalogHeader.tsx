import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CatalogHeaderProps {
  totalResults: number;
  sortBy: string;
  setSortBy: (v: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
  onToggleFilters: () => void;
  filtersVisible: boolean;
}

const CatalogHeader = ({
  totalResults,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onToggleFilters,
  filtersVisible,
}: CatalogHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Browse Listings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalResults.toLocaleString()} results found
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          className="lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatalogHeader;
