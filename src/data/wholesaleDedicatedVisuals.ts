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

export const FOOD_DRINK_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Snacks & Confectionery': photo('ZouNrDx0JaU', 'https://unsplash.com/photos/shelves-filled-with-various-chocolate-bars-and-snacks-ZouNrDx0JaU'),
  Beverages: photo('vkf9RGhYbEk', 'https://unsplash.com/photos/four-iced-drinks-with-tea-coffee-and-orange-juice-vkf9RGhYbEk'),
  'Canned & Dry Goods': photo('tuj7KHG2l_0', 'https://unsplash.com/photos/shelves-stocked-with-packaged-food-items-and-jars-tuj7KHG2l_0'),
  'Health Foods': photo('SqfOiQ9BAIg', 'https://unsplash.com/photos/assortment-of-nuts-and-dried-fruits-at-a-market-stall-SqfOiQ9BAIg'),
  'Specialty & Gourmet': photo('PuTuY_TDM7g', 'https://unsplash.com/photos/jars-of-preserves-and-condiments-displayed-on-supermarket-shelves-PuTuY_TDM7g'),
  Seasonal: photo('Pn-kJ9Bj-EU', 'https://unsplash.com/photos/a-table-topped-with-cookies-and-other-treats-Pn-kJ9Bj-EU'),
};

export const TOOLS_DIY_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Power Tools': photo('QvEXI1xquRY', 'https://unsplash.com/photos/yellow-and-black-cordless-power-drill-on-a-workbench-QvEXI1xquRY'),
  'Hand Tools': photo('Z3vFp7szCAY', 'https://unsplash.com/photos/yellow-and-black-handle-hammer-and-screw-driver-Z3vFp7szCAY'),
  Plumbing: photo('fR47SivxkSM', 'https://unsplash.com/photos/pile-of-gray-and-brown-water-pipes-fR47SivxkSM'),
  Electrical: photo('vT9zeLCOpps', 'https://unsplash.com/photos/white-usb-cable-plugged-in-white-electric-socket-vT9zeLCOpps'),
  'Paint & Decorating': photo('wgaV2vE5kp8', 'https://unsplash.com/photos/a-paint-can-with-a-brush-inside-of-it-wgaV2vE5kp8'),
  'Fixings & Hardware': photo('T-0cyGZHj6E', 'https://unsplash.com/photos/a-pile-of-assorted-screws-and-hardware-on-rusty-surface-T-0cyGZHj6E'),
};

export const SPORTS_LEISURE_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Fitness Equipment': photo('zBYG9kzN-8s', 'https://unsplash.com/photos/yoga-mat-weights-and-a-towel-ready-for-a-workout-zBYG9kzN-8s'),
  Cycling: photo('WL6CUTIGVpY', 'https://unsplash.com/photos/a-folded-bicycle-with-a-helmet-is-ready-WL6CUTIGVpY'),
  'Camping & Hiking': photo('QmzAMakD5Ro', 'https://unsplash.com/photos/tent-and-backpack-at-a-campsite-with-rocky-mountains-QmzAMakD5Ro'),
  'Water Sports': photo('rHRbxESCXac', 'https://unsplash.com/photos/a-man-on-a-paddle-board-rHRbxESCXac'),
  'Team Sports': photo('FzAyjb2_Hys', 'https://unsplash.com/photos/football-field-with-white-lines-numbers-hurdles-and-yellow-cones-FzAyjb2_Hys'),
  'Leisure & Travel': photo('TVllFyGaLEA', 'https://unsplash.com/photos/open-suitcase-with-travel-essentials-and-hat-TVllFyGaLEA'),
};

export const AUTOMOTIVE_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Car Parts': photo('J_Ymm6zw3Rg', 'https://unsplash.com/photos/close-up-of-car-engine-components-under-sunlight-J_Ymm6zw3Rg'),
  'Car Accessories': photo('R8P8iZ9nRko', 'https://unsplash.com/photos/smartphone-mount-inside-car-R8P8iZ9nRko'),
  'Cleaning & Valeting': photo('qy20XW0tSlw', 'https://unsplash.com/photos/a-microfiber-cloth-rests-on-a-shiny-blue-car-qy20XW0tSlw'),
  'Tools & Equipment': photo('aAMmjC4myFA', 'https://unsplash.com/photos/man-working-in-a-workshop-with-tools-and-a-van-aAMmjC4myFA'),
  'Oils & Fluids': photo('FHR7aqLxBgQ', 'https://unsplash.com/photos/a-bottle-of-motor-oil-sits-on-a-cardboard-box-FHR7aqLxBgQ'),
  'Tyres & Wheels': photo('2OaUmmRWlg8', 'https://unsplash.com/photos/pile-of-various-tires-and-wheels-stacked-together-2OaUmmRWlg8'),
};

export const OFFICE_STATIONERY_DEDICATED_VISUALS: DedicatedVisualMap = {
  'Office Furniture': photo('PB5-pTZE9H4', 'https://unsplash.com/photos/modern-office-interior-with-plants-and-filing-cabinets-PB5-pTZE9H4'),
  'Printers & Ink': photo('CGnoRQZGWmw', 'https://unsplash.com/photos/a-white-and-black-printer-sitting-on-top-of-a-counter-CGnoRQZGWmw'),
  'Paper & Supplies': photo('n9AaeihA9HI', 'https://unsplash.com/photos/open-notebook-with-pen-and-pencils-on-desk-n9AaeihA9HI'),
  'Office Tech': photo('T2afNvgK6vg', 'https://unsplash.com/photos/a-desk-with-a-keyboard-mouse-and-headphones-T2afNvgK6vg'),
  'Filing & Storage': photo('Q9y3LRuuxmg', 'https://unsplash.com/photos/file-cabinet-Q9y3LRuuxmg'),
  'Pens & Writing': photo('Iyt6vtvLDGA', 'https://unsplash.com/photos/pen-holder-filled-with-colored-markers-Iyt6vtvLDGA'),
};

export const DEDICATED_VISUALS_BY_CATEGORY: Record<string, DedicatedVisualMap> = {
  'Electronics & Technology': ELECTRONICS_DEDICATED_VISUALS,
  'Clothing & Apparel': CLOTHING_DEDICATED_VISUALS,
  'Home & Garden': HOME_GARDEN_DEDICATED_VISUALS,
  'Health & Beauty': HEALTH_BEAUTY_DEDICATED_VISUALS,
  'Toys & Games': TOYS_GAMES_DEDICATED_VISUALS,
  'Food & Drink': FOOD_DRINK_DEDICATED_VISUALS,
  'Tools & DIY': TOOLS_DIY_DEDICATED_VISUALS,
  'Sports & Leisure': SPORTS_LEISURE_DEDICATED_VISUALS,
  Automotive: AUTOMOTIVE_DEDICATED_VISUALS,
  'Office & Stationery': OFFICE_STATIONERY_DEDICATED_VISUALS,
};
