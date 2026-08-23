import type { DedicatedVisual } from './wholesaleDedicatedVisuals';

type DedicatedVisualMap = Record<string, DedicatedVisual>;

const photo = (id: string): DedicatedVisual => ({
  displayImage: `https://unsplash.com/photos/${id}/download?force=true`,
  sourcePage: `https://unsplash.com/photos/${id}`,
});

export const BABY_NURSERY_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Prams & Pushchairs': photo('Qnqvy_GqV5Q'),
  'Baby Clothing': photo('72l_I4s-hss'),
  Feeding: photo('TCYj_UxoIUY'),
  'Nursery Furniture': photo('ITAFnjCEWWw'),
  'Toys (0-3 yrs)': photo('Ukp07LmMi-k'),
  'Safety & Care': photo('ewnuZbyZLUg'),
};

export const JEWELLERY_WATCHES_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Necklaces & Pendants': photo('7_xFgeApJh8'),
  'Rings & Earrings': photo('s6cKGUOy0OE'),
  Bracelets: photo('El81kewBUgc'),
  Watches: photo('78h-B5zVsWI'),
  'Fashion Jewellery': photo('rW0X4xa_hpw'),
  Accessories: photo('R5Cgy-aAIxc'),
};

export const MIXED_LOTS_DEDICATED_VISUALS: DedicatedVisualMap = {
  'General Mixed': photo('RVP3wAw9gJY'),
  'Department Store Returns': photo('RI_VrbUngcA'),
  'Amazon Returns': photo('jcav1COVvOc'),
  'Seasonal Mixed': photo('UmsKC3s10yM'),
  'High Value Mixed': photo('mFUIel9hWos'),
  'Liquidation Lots': photo('I-_wYj9yOzw'),
};

export const CUSTOMER_RETURNS_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Electronics Returns': photo('6eP7GIpOlAM'),
  'Clothing Returns': photo('eM1t2kX2Dz4'),
  'Home Returns': photo('32xlFAZ1gk8'),
  'Appliance Returns': photo('NEqZ6Ox7Eyo'),
  'Graded Returns': photo('l9__1iNeDfc'),
  'Unchecked Returns': photo('RqZ-xGRnCYI'),
};

export const OVERSTOCK_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Brand Overstock': photo('Wpf8uWNiu3o'),
  'Seasonal Overstock': photo('0AKPfr-xlCU'),
  'End of Line': photo('M7G_m5XJ-go'),
  'Excess Inventory': photo('-aCrA9FmT8Y'),
  'Wholesale Lots': photo('K2YghSroNsY'),
  'Bulk Deals': photo('2mH3hbrYMac'),
};

export const CLEARANCE_DEALS_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Flash Sales': photo('SwJEXHvuJkg'),
  'Closing Down Stock': photo('mqYZWUG8T1U'),
  'Damaged Packaging': photo('gh6uXXV9a5I'),
  'Short Dated': photo('rWMIbqmOxrY'),
  'Sample Stock': photo('3eM-RLzpe3A'),
  'One-Off Deals': photo('tKpb2pP7-Bc'),
};

export const ADDITIONAL_DEDICATED_VISUALS_BY_CATEGORY: Record<string, DedicatedVisualMap> = {
  'Baby & Nursery': BABY_NURSERY_DEDICATED_VISUALS,
  'Jewellery & Watches': JEWELLERY_WATCHES_DEDICATED_VISUALS,
  'Mixed Lots': MIXED_LOTS_DEDICATED_VISUALS,
  'Customer Returns': CUSTOMER_RETURNS_DEDICATED_VISUALS,
  Overstock: OVERSTOCK_DEDICATED_VISUALS,
  'Clearance Deals': CLEARANCE_DEALS_DEDICATED_VISUALS,
};
