export const BRAND = {
  name: "Loadify Market",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@loadifymarket.co.uk",
  currency: import.meta.env.VITE_CURRENCY || "GBP",
  currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || "£",
  marketplaceFeePercent: Number(import.meta.env.VITE_MARKETPLACE_FEE_PERCENT) || 7,
  returnsDays: Number(import.meta.env.VITE_RETURNS_DAYS) || 14,
  vatNumber: import.meta.env.VITE_VAT_NUMBER || "GB375949535",
  companyName: import.meta.env.VITE_COMPANY_NAME || "XDrive Logistics Ltd",
  companyNumber: "13171804",
  companyAddress: import.meta.env.VITE_COMPANY_ADDRESS || "101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom",
  tagline: "UK Multi-Category Marketplace — Buy & Sell Anything",
  domain: "https://loadifymarket.co.uk",
} as const;
