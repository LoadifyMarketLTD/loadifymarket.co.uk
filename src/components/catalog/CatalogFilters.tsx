import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

const categories = [
  "Electronics & Technology",
  "Clothing & Apparel",
  "Home & Garden",
  "Health & Beauty",
  "Toys & Games",
  "Food & Drink",
  "Tools & DIY",
  "Sports & Leisure",
  "Automotive",
  "Office & Stationery",
  "Baby & Nursery",
  "Jewellery & Watches",
  "Mixed Lots",
  "Customer Returns",
  "Overstock",
  "Clearance Deals",
];

const conditions = ["New", "Like New", "Mixed", "Unchecked", "Damaged Packaging"];

const locations = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Glasgow",
  "Bristol",
  "Liverpool",
  "Sheffield",
  "Edinburgh",
  "Cardiff",
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true }: FilterSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-foreground"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="pt-2 space-y-2">{children}</div>}
    </div>
  );
};

interface CatalogFiltersProps {
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  selectedConditions: string[];
  setSelectedConditions: (v: string[]) => void;
  selectedLocations: string[];
  setSelectedLocations: (v: string[]) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  onClearAll: () => void;
}

const CatalogFilters = ({
  selectedCategories,
  setSelectedCategories,
  selectedConditions,
  setSelectedConditions,
  selectedLocations,
  setSelectedLocations,
  priceRange,
  setPriceRange,
  onClearAll,
}: CatalogFiltersProps) => {
  const totalActive =
    selectedCategories.length + selectedConditions.length + selectedLocations.length +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">Filters</h3>
        {totalActive > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground h-auto p-0">
            Clear all ({totalActive})
          </Button>
        )}
      </div>

      <FilterSection title="Category">
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleItem(selectedCategories, setSelectedCategories, cat)}
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        {conditions.map((cond) => (
          <label key={cond} className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={selectedConditions.includes(cond)}
              onCheckedChange={() => toggleItem(selectedConditions, setSelectedConditions, cond)}
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {cond}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="px-1 pt-2">
          <Slider
            min={0}
            max={10000}
            step={100}
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as [number, number])}
            className="mb-3"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>£{priceRange[0].toLocaleString()}</span>
            <span>£{priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Location" defaultOpen={false}>
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
          {locations.map((loc) => (
            <label key={loc} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={selectedLocations.includes(loc)}
                onCheckedChange={() => toggleItem(selectedLocations, setSelectedLocations, loc)}
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {loc}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
};

export default CatalogFilters;
