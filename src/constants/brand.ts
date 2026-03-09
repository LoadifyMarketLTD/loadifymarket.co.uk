export const BRAND = {
  name: "Loadify Market",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "loadifymarket.co.uk@gmail.com",
  currency: import.meta.env.VITE_CURRENCY || "GBP",
  currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || "£",
  marketplaceFeePercent: Number(import.meta.env.VITE_MARKETPLACE_FEE_PERCENT) || 7,
  returnsDays: Number(import.meta.env.VITE_RETURNS_DAYS) || 14,
  vatNumber: import.meta.env.VITE_VAT_NUMBER || "GB375949535",
  companyName: import.meta.env.VITE_COMPANY_NAME || "Loadify Market Ltd",
  companyAddress: import.meta.env.VITE_COMPANY_ADDRESS || "101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom",
} as const;
