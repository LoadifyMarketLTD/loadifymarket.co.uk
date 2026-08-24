import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

const conditions = ["New", "Like New", "Mixed", "Unchecked"];

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
  light?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true, light = false }: FilterSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-b pb-4 ${light ? "border-slate-200" : "border-border"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between py-2 text-sm font-semibold ${light ? "text-[#0A234F]" : "text-foreground"}`}
      >
        {title}
        {open ? <ChevronUp className={`h-4 w-4 ${light ? "text-slate-500" : "text-muted-foreground"}`} /> : <ChevronDown className={`h-4 w-4 ${light ? "text-slate-500" : "text-muted-foreground"}`} />}
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
  /** Real category names fetched from DB — falls back to hardcoded list when not supplied */
  availableCategories?: string[];
  theme?: "default" | "light";
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
  availableCategories,
  theme = "light",
}: CatalogFiltersProps) => {
  const light = theme === "light";
  // Use DB-sourced category names when provided; show empty list otherwise
  const categoryList = availableCategories && availableCategories.length > 0
    ? availableCategories
    : [];

  const totalActive =
    selectedCategories.length + selectedConditions.length + selectedLocations.length +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-base font-semibold ${light ? "text-[#0A234F]" : "text-foreground"}`}>Filters</h3>
        {totalActive > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className={`text-xs h-auto p-0 ${light ? "text-slate-500 hover:text-[#0A234F]" : "text-muted-foreground hover:text-foreground"}`}>
            Clear all ({totalActive})
          </Button>
        )}
      </div>

      <FilterSection title="Category" light={light}>
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {categoryList.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleItem(selectedCategories, setSelectedCategories, cat)}
              />
              <span className={`text-sm transition-colors truncate ${light ? "text-slate-600 group-hover:text-[#0A234F]" : "text-muted-foreground group-hover:text-foreground"}`}>
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Condition" light={light}>
        {conditions.map((cond) => (
          <label key={cond} className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={selectedConditions.includes(cond)}
              onCheckedChange={() => toggleItem(selectedConditions, setSelectedConditions, cond)}
            />
            <span className={`text-sm transition-colors ${light ? "text-slate-600 group-hover:text-[#0A234F]" : "text-muted-foreground group-hover:text-foreground"}`}>
              {cond}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Price Range" light={light}>
        <div className="px-1 pt-2">
          <Slider
            min={0}
            max={10000}
            step={100}
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as [number, number])}
            className="mb-3"
          />
          <div className={`flex items-center justify-between text-sm ${light ? "text-slate-600" : "text-muted-foreground"}`}>
            <span>£{priceRange[0].toLocaleString("en-GB")}</span>
            <span>£{priceRange[1].toLocaleString("en-GB")}</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Location" defaultOpen={false} light={light}>
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
          {locations.map((loc) => (
            <label key={loc} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={selectedLocations.includes(loc)}
                onCheckedChange={() => toggleItem(selectedLocations, setSelectedLocations, loc)}
              />
              <span className={`text-sm transition-colors ${light ? "text-slate-600 group-hover:text-[#0A234F]" : "text-muted-foreground group-hover:text-foreground"}`}>
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
