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
  { label: "Platform", to: "/platform", description: "See how the Loadify ecosystem is structured" },
  { label: "Buyers", to: "/buyers", description: "Discover, buy and manage marketplace activity" },
  { label: "Sellers", to: "/sellers", description: "Build and operate a seller presence" },
  { label: "Business", to: "/business", description: "Trade buying and supplier participation paths" },
  { label: "Technology", to: "/technology", description: "Controlled commerce connectivity and technical context" },
  { label: "Partners", to: "/partners", description: "Commercial and strategic participation" },
  { label: "How It Works", to: "/how-it-works", description: "Follow the marketplace lifecycle" },
  { label: "Trust", to: "/trust", description: "Explore platform trust and governance" },
];

export const businessNavigation: PublicNavItem[] = [
  { label: "Overview", to: "/business", description: "Business participation across buying and supply" },
  { label: "Trade Buyers", to: "/trade", description: "Dedicated business and trader registration path" },
  { label: "Suppliers, Brands & Wholesalers", to: "/suppliers", description: "Explore supplier, brand and wholesale participation routes" },
];

export const technologyNavigation: PublicNavItem[] = [
  { label: "Overview", to: "/technology", description: "Technology and connectivity model" },
  { label: "Integrations", to: "/integrations", description: "Controlled supplier-commerce and technology connectivity" },
  { label: "Developers", to: "/developers", description: "Technical participation and access context" },
];

export const publicNavigationGroups: PublicNavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Overview", to: "/platform" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "For Buyers", to: "/buyers" },
      { label: "For Sellers", to: "/sellers" },
    ],
  },
  { label: "Business", items: businessNavigation },
  { label: "Technology", items: technologyNavigation },
  {
    label: "Connect",
    items: [
      { label: "Partners", to: "/partners" },
      { label: "Contact", to: "/contact" },
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
  {
    label: "Marketplace",
    items: [
      { label: "Open Marketplace", to: "/marketplace" },
      { label: "Browse Products", to: "/catalog" },
      { label: "Deals", to: "/deals" },
    ],
  },
];

export const utilityPublicNavigation: PublicNavItem[] = [
  { label: "Marketplace", to: "/marketplace" },
  { label: "Trust", to: "/trust" },
  { label: "Help", to: "/help" },
];
