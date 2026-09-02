export type PublicNavItem = {
  label: string;
  to: string;
  description?: string;
};

export type PublicNavGroup = {
  label: string;
  items: PublicNavItem[];
};

export const primaryPublicNavigation: PublicNavItem[] = [
  { label: "Marketplace", to: "/catalog", description: "Browse products and categories" },
  { label: "Platform", to: "/platform", description: "See how the Loadify marketplace is structured" },
  { label: "Buyers", to: "/buyers", description: "Discover, buy and manage marketplace orders" },
  { label: "Sellers", to: "/sellers", description: "Build and operate a seller presence" },
  { label: "Integrations", to: "/integrations", description: "Supplier-commerce and partner connectivity" },
  { label: "Partners", to: "/partners", description: "Commercial and technology partnerships" },
];

export const businessNavigation: PublicNavItem[] = [
  { label: "Trade Buyers", to: "/trade", description: "Dedicated business and trader registration path" },
  { label: "Brands & Wholesalers", to: "/suppliers", description: "Explore product-supply participation routes" },
  { label: "Suppliers", to: "/suppliers", description: "Supplier and catalogue participation" },
];

export const publicNavigationGroups: PublicNavGroup[] = [
  {
    label: "Explore",
    items: [
      { label: "Marketplace", to: "/catalog" },
      { label: "Deals", to: "/deals" },
      { label: "Browse Categories", to: "/catalog" },
    ],
  },
  {
    label: "Discover Loadify",
    items: [
      { label: "Platform", to: "/platform" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "For Buyers", to: "/buyers" },
      { label: "For Sellers", to: "/sellers" },
    ],
  },
  {
    label: "Business",
    items: businessNavigation,
  },
  {
    label: "Connect with Loadify",
    items: [
      { label: "Integrations", to: "/integrations" },
      { label: "Partners", to: "/partners" },
      { label: "Developers", to: "/developers" },
    ],
  },
  {
    label: "Trust & Company",
    items: [
      { label: "Trust & Safety", to: "/trust" },
      { label: "About Loadify", to: "/about" },
      { label: "Help Centre", to: "/help" },
      { label: "Contact", to: "/contact" },
    ],
  },
];

export const utilityPublicNavigation: PublicNavItem[] = [
  { label: "Trust", to: "/trust" },
  { label: "Help", to: "/help" },
];
