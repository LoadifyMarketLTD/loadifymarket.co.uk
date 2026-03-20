import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Shirt, Laptop, Home, Wrench, ShoppingBag,
  Heart, Gamepad2, UtensilsCrossed, Car, Briefcase,
  Dumbbell, Baby, Sparkles, ChevronDown, ChevronUp,
  RotateCcw, TrendingDown, Layers
} from "lucide-react";

import electronicsImg from "@/assets/categories/electronics.jpg";
import clothingImg from "@/assets/categories/clothing.jpg";
import homeImg from "@/assets/categories/home.jpg";
import healthBeautyImg from "@/assets/categories/health-beauty.jpg";
import toysImg from "@/assets/categories/toys.jpg";
import foodDrinkImg from "@/assets/categories/food-drink.jpg";
import toolsImg from "@/assets/categories/tools.jpg";
import sportsImg from "@/assets/categories/sports.jpg";
import automotiveImg from "@/assets/categories/automotive.jpg";
import officeImg from "@/assets/categories/office.jpg";
import babyImg from "@/assets/categories/baby.jpg";
import jewelleryImg from "@/assets/categories/jewellery.jpg";
import mixedPalletsImg from "@/assets/categories/mixed-pallets.jpg";
import returnsImg from "@/assets/categories/returns.jpg";
import overstockImg from "@/assets/categories/overstock.jpg";
import clearanceImg from "@/assets/categories/clearance.jpg";

const categories = [
  {
    icon: Laptop,
    label: "Electronics & Technology",
    count: "85+ listings",
    image: electronicsImg,
    subcategories: ["Phones & Tablets", "Laptops & PCs", "TV & Audio", "Gaming Consoles", "Accessories", "Smart Home"],
  },
  {
    icon: Shirt,
    label: "Clothing & Apparel",
    count: "200+ listings",
    image: clothingImg,
    subcategories: ["Men's Clothing", "Women's Clothing", "Children's Clothing", "Footwear", "Accessories & Bags", "Sportswear"],
  },
  {
    icon: Home,
    label: "Home & Garden",
    count: "95+ listings",
    image: homeImg,
    subcategories: ["Furniture", "Kitchen & Dining", "Bedding & Linen", "Garden & Outdoor", "Lighting", "Décor & Accessories"],
  },
  {
    icon: Heart,
    label: "Health & Beauty",
    count: "110+ listings",
    image: healthBeautyImg,
    subcategories: ["Skincare", "Haircare", "Makeup & Cosmetics", "Fragrances", "Health & Wellness", "Personal Care"],
  },
  {
    icon: Gamepad2,
    label: "Toys & Games",
    count: "75+ listings",
    image: toysImg,
    subcategories: ["Action Figures", "Board Games", "Educational Toys", "Outdoor Toys", "Dolls & Playsets", "Puzzles"],
  },
  {
    icon: UtensilsCrossed,
    label: "Food & Drink",
    count: "60+ listings",
    image: foodDrinkImg,
    subcategories: ["Snacks & Confectionery", "Beverages", "Canned & Dry Goods", "Health Foods", "Specialty & Gourmet", "Seasonal"],
  },
  {
    icon: Wrench,
    label: "Tools & DIY",
    count: "55+ listings",
    image: toolsImg,
    subcategories: ["Power Tools", "Hand Tools", "Plumbing", "Electrical", "Paint & Decorating", "Fixings & Hardware"],
  },
  {
    icon: Dumbbell,
    label: "Sports & Leisure",
    count: "65+ listings",
    image: sportsImg,
    subcategories: ["Fitness Equipment", "Cycling", "Camping & Hiking", "Water Sports", "Team Sports", "Leisure & Travel"],
  },
  {
    icon: Car,
    label: "Automotive",
    count: "40+ listings",
    image: automotiveImg,
    subcategories: ["Car Parts", "Car Accessories", "Cleaning & Valeting", "Tools & Equipment", "Oils & Fluids", "Tyres & Wheels"],
  },
  {
    icon: Briefcase,
    label: "Office & Stationery",
    count: "45+ listings",
    image: officeImg,
    subcategories: ["Office Furniture", "Printers & Ink", "Paper & Supplies", "Office Tech", "Filing & Storage", "Pens & Writing"],
  },
  {
    icon: Baby,
    label: "Baby & Nursery",
    count: "50+ listings",
    image: babyImg,
    subcategories: ["Prams & Pushchairs", "Baby Clothing", "Feeding", "Nursery Furniture", "Toys (0-3 yrs)", "Safety & Care"],
  },
  {
    icon: Sparkles,
    label: "Jewellery & Watches",
    count: "30+ listings",
    image: jewelleryImg,
    subcategories: ["Necklaces & Pendants", "Rings & Earrings", "Bracelets", "Watches", "Fashion Jewellery", "Accessories"],
  },
  {
    icon: Package,
    label: "Mixed Lots",
    count: "120+ listings",
    image: mixedPalletsImg,
    subcategories: ["General Mixed", "Department Store Returns", "Amazon Returns", "Seasonal Mixed", "High Value Mixed", "Liquidation Lots"],
  },
  {
    icon: RotateCcw,
    label: "Customer Returns",
    count: "90+ listings",
    image: returnsImg,
    subcategories: ["Electronics Returns", "Clothing Returns", "Home Returns", "Appliance Returns", "Graded Returns", "Unchecked Returns"],
  },
  {
    icon: Layers,
    label: "Overstock",
    count: "130+ listings",
    image: overstockImg,
    subcategories: ["Brand Overstock", "Seasonal Overstock", "End of Line", "Excess Inventory", "Wholesale Lots", "Bulk Deals"],
  },
  {
    icon: TrendingDown,
    label: "Clearance Deals",
    count: "150+ listings",
    image: clearanceImg,
    subcategories: ["Flash Sales", "Closing Down Stock", "Damaged Packaging", "Short Dated", "Sample Stock", "One-Off Deals"],
  },
];

const CategoriesSection = () => {
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleCategories = showAll ? categories : categories.slice(0, 8);

  return (
    <section id="categories" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Categories</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Browse by Category
          </h2>
          <p className="mt-4 text-muted-foreground">
            Find exactly what you're looking for across our wide range of wholesale, stock and clearance categories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCategories.map((cat, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={cat.label}
                className="group rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300 overflow-hidden"
              >
                {/* Category header with image */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display text-sm font-semibold text-foreground block truncate">{cat.label}</span>
                    <span className="text-xs text-muted-foreground">{cat.count}</span>
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors border-t border-border"
                >
                  <span className="text-xs font-medium text-muted-foreground">Subcategories</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
                    <ul className="space-y-1.5">
                      {cat.subcategories.map((sub) => (
                        <li key={sub}>
                          <button
                            onClick={() => navigate(`/catalog?category=${encodeURIComponent(cat.label)}`)}
                            className="w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1 px-3 rounded-md hover:bg-primary/5"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categories.length > 8 && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setShowAll(!showAll);
                setExpandedIndex(null);
              }}
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline transition-all"
            >
              {showAll ? "Show Less" : `View All ${categories.length} Categories`}
              {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoriesSection;
