export type WholesaleSubcategoryBlueprint = {
  categoryLabel: string;
  subcategoryLabel: string;
  focus: string;
};

export const WHOLESALE_SUBCATEGORY_BLUEPRINT: WholesaleSubcategoryBlueprint[] = [
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'Phones & Tablets', focus: 'smartphone, tablet and charging accessories' },
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'Laptops & PCs', focus: 'laptop, monitor, keyboard and desktop computer setup' },
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'TV & Audio', focus: 'television, soundbar, speakers and headphones' },
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'Gaming Consoles', focus: 'gaming console, controller and gaming accessories' },
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'Accessories', focus: 'cables, chargers, hubs, mouse and power banks' },
  { categoryLabel: 'Electronics & Technology', subcategoryLabel: 'Smart Home', focus: 'smart speaker, security camera, smart bulb and thermostat' },

  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: "Men's Clothing", focus: 'mens shirts, jackets, trousers and knitwear' },
  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: "Women's Clothing", focus: 'womens dresses, blouses, coats and knitwear' },
  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: "Children's Clothing", focus: 'childrens clothing sets, jackets and everyday wear' },
  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: 'Footwear', focus: 'trainers, shoes and boots' },
  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: 'Accessories & Bags', focus: 'handbags, backpacks, belts and fashion accessories' },
  { categoryLabel: 'Clothing & Apparel', subcategoryLabel: 'Sportswear', focus: 'activewear, leggings, tracksuits and sports tops' },

  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Furniture', focus: 'sofa, chairs, table and shelving' },
  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Kitchen & Dining', focus: 'cookware, plates, glasses and kitchen utensils' },
  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Bedding & Linen', focus: 'duvets, pillows, bed linen and towels' },
  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Garden & Outdoor', focus: 'outdoor furniture, plants, pots and watering equipment' },
  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Lighting', focus: 'table lamps, pendant lights, ceiling lights and floor lamps' },
  { categoryLabel: 'Home & Garden', subcategoryLabel: 'Décor & Accessories', focus: 'vases, frames, mirrors, cushions and candles' },

  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Skincare', focus: 'cleansers, serums and moisturisers' },
  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Haircare', focus: 'shampoo, conditioner, hair masks and hair tools' },
  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Makeup & Cosmetics', focus: 'lipstick, palettes, brushes and foundation' },
  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Fragrances', focus: 'perfume bottles and refined fragrance presentation' },
  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Health & Wellness', focus: 'non-medicinal wellness products and self-care items' },
  { categoryLabel: 'Health & Beauty', subcategoryLabel: 'Personal Care', focus: 'body care, grooming and hygiene products' },

  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Action Figures', focus: 'action figures and playsets' },
  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Board Games', focus: 'board games, cards and tabletop games' },
  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Educational Toys', focus: 'learning toys and building sets' },
  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Outdoor Toys', focus: 'balls, garden play equipment and outdoor toys' },
  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Dolls & Playsets', focus: 'dolls and themed playsets' },
  { categoryLabel: 'Toys & Games', subcategoryLabel: 'Puzzles', focus: 'jigsaw puzzles and puzzle boxes' },

  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Snacks & Confectionery', focus: 'snacks, sweets and chocolate' },
  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Beverages', focus: 'soft drinks, juices, tea and coffee products' },
  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Canned & Dry Goods', focus: 'canned food, rice, pasta and pantry products' },
  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Health Foods', focus: 'nuts, grains and healthy packaged food' },
  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Specialty & Gourmet', focus: 'sauces, preserves and gourmet products' },
  { categoryLabel: 'Food & Drink', subcategoryLabel: 'Seasonal', focus: 'seasonal packaged food and drink products appropriate to the period' },

  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Power Tools', focus: 'drills, saws and sanders' },
  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Hand Tools', focus: 'screwdrivers, spanners, pliers and hammers' },
  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Plumbing', focus: 'fittings, taps, hoses and plumbing tools' },
  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Electrical', focus: 'cables, sockets and electrical accessories' },
  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Paint & Decorating', focus: 'paint, brushes and rollers' },
  { categoryLabel: 'Tools & DIY', subcategoryLabel: 'Fixings & Hardware', focus: 'screws, bolts, hinges and brackets' },

  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Fitness Equipment', focus: 'dumbbells, exercise mats and resistance equipment' },
  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Cycling', focus: 'bicycle, helmet, pump and cycling accessories' },
  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Camping & Hiking', focus: 'tent, backpack and sleeping bag' },
  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Water Sports', focus: 'paddle, swim and water-sport accessories' },
  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Team Sports', focus: 'footballs, basketballs, cones and training kit' },
  { categoryLabel: 'Sports & Leisure', subcategoryLabel: 'Leisure & Travel', focus: 'luggage, travel bags and leisure accessories' },

  { categoryLabel: 'Automotive', subcategoryLabel: 'Car Parts', focus: 'generic automotive replacement parts' },
  { categoryLabel: 'Automotive', subcategoryLabel: 'Car Accessories', focus: 'car mats, phone holders and organisers' },
  { categoryLabel: 'Automotive', subcategoryLabel: 'Cleaning & Valeting', focus: 'microfibre cloths, brushes and detailing products' },
  { categoryLabel: 'Automotive', subcategoryLabel: 'Tools & Equipment', focus: 'automotive workshop tools and equipment' },
  { categoryLabel: 'Automotive', subcategoryLabel: 'Oils & Fluids', focus: 'motor oil, coolant and screenwash containers with no visible branding' },
  { categoryLabel: 'Automotive', subcategoryLabel: 'Tyres & Wheels', focus: 'tyres, wheels and wheel-care products' },

  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Office Furniture', focus: 'desks, office chairs and cabinets' },
  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Printers & Ink', focus: 'printers, cartridges and print supplies' },
  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Paper & Supplies', focus: 'paper, envelopes and notebooks' },
  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Office Tech', focus: 'keyboards, mice and headsets' },
  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Filing & Storage', focus: 'folders, storage boxes and organisers' },
  { categoryLabel: 'Office & Stationery', subcategoryLabel: 'Pens & Writing', focus: 'pens, markers and pencils' },

  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Prams & Pushchairs', focus: 'stroller or pushchair in a clean nursery or retail setting' },
  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Baby Clothing', focus: 'baby bodysuits and baby outfits' },
  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Feeding', focus: 'baby bottles, bowls and feeding accessories' },
  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Nursery Furniture', focus: 'cot, changing unit and nursery storage' },
  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Toys (0-3 yrs)', focus: 'soft toys, sensory toys and early-learning toys for ages zero to three' },
  { categoryLabel: 'Baby & Nursery', subcategoryLabel: 'Safety & Care', focus: 'baby monitor, safety gate and care accessories' },

  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Necklaces & Pendants', focus: 'necklaces and pendants' },
  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Rings & Earrings', focus: 'rings and earrings' },
  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Bracelets', focus: 'bracelets and bangles' },
  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Watches', focus: 'wristwatches' },
  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Fashion Jewellery', focus: 'mixed fashion-jewellery sets' },
  { categoryLabel: 'Jewellery & Watches', subcategoryLabel: 'Accessories', focus: 'jewellery boxes and fashion accessories' },

  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'General Mixed', focus: 'mixed retail cartons with varied unbranded merchandise' },
  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'Department Store Returns', focus: 'mixed department-store returned goods in organised cartons or pallets' },
  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'Amazon Returns', focus: 'generic e-commerce returns in cartons with no Amazon logo visible' },
  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'Seasonal Mixed', focus: 'mixed seasonal wholesale stock' },
  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'High Value Mixed', focus: 'higher-value mixed electronics, home and lifestyle merchandise lots' },
  { categoryLabel: 'Mixed Lots', subcategoryLabel: 'Liquidation Lots', focus: 'palletised liquidation merchandise' },

  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Electronics Returns', focus: 'returned electronics in organised resale condition' },
  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Clothing Returns', focus: 'returned apparel in organised resale stock' },
  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Home Returns', focus: 'returned homeware products' },
  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Appliance Returns', focus: 'small appliances and electrical returns' },
  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Graded Returns', focus: 'organised graded-return stock clearly separated by condition' },
  { categoryLabel: 'Customer Returns', subcategoryLabel: 'Unchecked Returns', focus: 'sealed cartons awaiting inspection' },

  { categoryLabel: 'Overstock', subcategoryLabel: 'Brand Overstock', focus: 'excess branded-style merchandise with no visible trademarks' },
  { categoryLabel: 'Overstock', subcategoryLabel: 'Seasonal Overstock', focus: 'seasonal surplus inventory' },
  { categoryLabel: 'Overstock', subcategoryLabel: 'End of Line', focus: 'discontinued and end-of-line goods' },
  { categoryLabel: 'Overstock', subcategoryLabel: 'Excess Inventory', focus: 'cartons of surplus inventory' },
  { categoryLabel: 'Overstock', subcategoryLabel: 'Wholesale Lots', focus: 'palletised wholesale merchandise' },
  { categoryLabel: 'Overstock', subcategoryLabel: 'Bulk Deals', focus: 'large grouped quantities prepared for trade purchase' },

  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'Flash Sales', focus: 'premium retail goods with discreet clearance presentation and no visible price text' },
  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'Closing Down Stock', focus: 'mixed shop-clearance goods' },
  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'Damaged Packaging', focus: 'intact products with visibly damaged outer packaging' },
  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'Short Dated', focus: 'packaged consumables or food represented neutrally without misleading freshness claims' },
  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'Sample Stock', focus: 'showroom, demo and sample products' },
  { categoryLabel: 'Clearance Deals', subcategoryLabel: 'One-Off Deals', focus: 'assorted one-off wholesale opportunities' },
];

export function findWholesaleSubcategoryBlueprint(categoryLabel: string, subcategoryLabel: string) {
  return WHOLESALE_SUBCATEGORY_BLUEPRINT.find(
    (entry) => entry.categoryLabel === categoryLabel && entry.subcategoryLabel === subcategoryLabel,
  );
}
