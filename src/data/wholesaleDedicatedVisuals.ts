export type DedicatedVisual = {
  displayImage: string;
  sourcePage: string;
};

type DedicatedVisualMap = Record<string, DedicatedVisual>;

const photo = (id: string, sourcePage: string): DedicatedVisual => ({
  displayImage: `https://unsplash.com/photos/${id}/download?force=true`,
  sourcePage,
});

export const ELECTRONICS_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Phones & Tablets': photo('TK0kQP476cU', 'https://unsplash.com/photos/devices-like-laptops-tablets-and-phones-are-on-a-desk-TK0kQP476cU'),
  'Laptops & PCs': photo('XJXWbfSo2f0', 'https://unsplash.com/photos/turned-on-gray-laptop-computer-XJXWbfSo2f0'),
  'TV & Audio': photo('o9KZozGAKQo', 'https://unsplash.com/photos/white-and-gray-google-smart-speaker-beside-black-flat-screen-tv-o9KZozGAKQo'),
  'Gaming Consoles': photo('-dNlbaqOZJU', 'https://unsplash.com/photos/close-up-view-of-a-gaming-controller-lit-in-green--dNlbaqOZJU'),
  Accessories: photo('Fhyt8se0E50', 'https://unsplash.com/photos/a-close-up-of-a-power-cord-and-a-charger-Fhyt8se0E50'),
  'Smart Home': photo('kDCIBGqU0_0', 'https://unsplash.com/photos/a-white-smart-speaker-on-a-white-surface-kDCIBGqU0_0'),
};

export const CLOTHING_DEDICATED_VISUALS: DedicatedVisualMap = {
  "Men's Clothing": photo('mwa_nzFpnJw', 'https://unsplash.com/photos/mwa_nzFpnJw'),
  "Women's Clothing": photo('dlxLGIy-2VU', 'https://unsplash.com/photos/dlxLGIy-2VU'),
  "Children's Clothing": photo('GCDjllzoKLo', 'https://unsplash.com/photos/GCDjllzoKLo'),
  Footwear: photo('bdCdXvEgWIQ', 'https://unsplash.com/photos/bdCdXvEgWIQ'),
  'Accessories & Bags': photo('tcVH_BwHtrc', 'https://unsplash.com/photos/tcVH_BwHtrc'),
  Sportswear: photo('d3bYmnZ0ank', 'https://unsplash.com/photos/d3bYmnZ0ank'),
};

export const HOME_GARDEN_DEDICATED_VISUALS: DedicatedVisualMap = {
  Furniture: photo('jw_Y7R3NabQ', 'https://unsplash.com/photos/a-bright-modern-living-room-with-comfortable-furniture-jw_Y7R3NabQ'),
  'Kitchen & Dining': photo('alXdbCZoQZI', 'https://unsplash.com/photos/bright-kitchen-with-dining-table-and-stainless-steel-refrigerator-alXdbCZoQZI'),
  'Bedding & Linen': photo('L9GsIbPCXKU', 'https://unsplash.com/photos/a-clean-bright-bedroom-with-a-large-bed-L9GsIbPCXKU'),
  'Garden & Outdoor': photo('fVRSm1R5U_Q', 'https://unsplash.com/photos/garden-patio-with-two-chairs-lush-plants-and-warm-lighting-fVRSm1R5U_Q'),
  Lighting: photo('Vhtg2xwr6rc', 'https://unsplash.com/photos/three-modern-pendant-lights-hang-over-a-kitchen-island-Vhtg2xwr6rc'),
  'Décor & Accessories': photo('qwA42l83ylg', 'https://unsplash.com/photos/three-lit-candles-reflect-in-a-mirror-qwA42l83ylg'),
};

export const HEALTH_BEAUTY_DEDICATED_VISUALS: DedicatedVisualMap = {
  Skincare: photo('0nH1XIq5rqw', 'https://unsplash.com/photos/retinol-serum-bottles-and-facial-cleanser-tube-0nH1XIq5rqw'),
  Haircare: photo('YVuPA2D-VpA', 'https://unsplash.com/photos/hair-care-products-are-neatly-displayed-on-a-stand-YVuPA2D-VpA'),
  'Makeup & Cosmetics': photo('RS49PbJ3st4', 'https://unsplash.com/photos/assortment-of-makeup-brushes-and-cosmetics-on-a-table-RS49PbJ3st4'),
  Fragrances: photo('So4eFi-d1nc', 'https://unsplash.com/photos/clear-perfume-bottle-So4eFi-d1nc'),
  'Health & Wellness': photo('Pay1UKAf_-g', 'https://unsplash.com/photos/a-candle-nestled-among-dried-lavender-flowers-Pay1UKAf_-g'),
  'Personal Care': photo('QY13zZlNyf0', 'https://unsplash.com/photos/double-edge-razor-shaving-cream-and-brush-QY13zZlNyf0'),
};

export const TOYS_GAMES_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Action Figures': photo('Tlg4g66hJ18', 'https://unsplash.com/photos/a-large-collection-of-assorted-action-figures-and-toys-Tlg4g66hJ18'),
  'Board Games': photo('mWcSBg1zb8o', 'https://unsplash.com/photos/board-game-with-dice-golden-dog-tokens-and-cards-mWcSBg1zb8o'),
  'Educational Toys': photo('DJSJVSTOHp0', 'https://unsplash.com/photos/a-basket-filled-with-colorful-wooden-building-blocks-DJSJVSTOHp0'),
  'Outdoor Toys': photo('ibPFDW1iVBY', 'https://unsplash.com/photos/two-colorful-ride-on-toys-in-a-grassy-area-ibPFDW1iVBY'),
  'Dolls & Playsets': photo('yz1CcmUZLQg', 'https://unsplash.com/photos/several-dolls-and-small-toys-scattered-on-a-surface-yz1CcmUZLQg'),
  Puzzles: photo('MCDKghXIbNY', 'https://unsplash.com/photos/pile-of-scattered-jigsaw-puzzle-pieces-MCDKghXIbNY'),
};

export const DEDICATED_VISUALS_BY_CATEGORY: Record<string, DedicatedVisualMap> = {
  'Electronics & Technology': ELECTRONICS_DEDICATED_VISUALS,
  'Clothing & Apparel': CLOTHING_DEDICATED_VISUALS,
  'Home & Garden': HOME_GARDEN_DEDICATED_VISUALS,
  'Health & Beauty': HEALTH_BEAUTY_DEDICATED_VISUALS,
  'Toys & Games': TOYS_GAMES_DEDICATED_VISUALS,
};
