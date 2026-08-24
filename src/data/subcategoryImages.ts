export type SubcategoryImageSource = {
  image: string;
  source: "unsplash" | "loadify-generated";
  license: "Unsplash License" | "Loadify Market editorial asset";
};

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&fm=jpg&q=82&w=1600&h=1200`;
const download = (id: string) => `https://unsplash.com/photos/${id}/download?force=true&w=1600`;
const local = (category: string, filename: string) => `/images/subcategories/${category}/${filename}.webp`;
const key = (category: string, subcategory: string) => `${category}::${subcategory}`;

/** Representative editorial navigation imagery only; never product listings. */
export const subcategoryImages: Record<string, SubcategoryImageSource> = {
  [key("Electronics & Technology", "Phones & Tablets")]: { image: image("photo-1637414165749-9b3cd88b8271"), source: "unsplash", license: "Unsplash License" },
  [key("Electronics & Technology", "Laptops & PCs")]: { image: image("photo-1781871670335-660e05ae7406"), source: "unsplash", license: "Unsplash License" },
  [key("Electronics & Technology", "TV & Audio")]: { image: image("photo-1618139764364-f53a1831b6b0"), source: "unsplash", license: "Unsplash License" },
  [key("Electronics & Technology", "Gaming Consoles")]: { image: image("photo-1665041974623-d398d035023e"), source: "unsplash", license: "Unsplash License" },
  [key("Electronics & Technology", "Accessories")]: { image: image("photo-1683738100989-907877fcce67"), source: "unsplash", license: "Unsplash License" },
  [key("Electronics & Technology", "Smart Home")]: { image: image("photo-1730967844913-29eb5cae5f34"), source: "unsplash", license: "Unsplash License" },

  [key("Clothing & Apparel", "Men's Clothing")]: { image: local("clothing-apparel", "mens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Women's Clothing")]: { image: local("clothing-apparel", "womens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Children's Clothing")]: { image: local("clothing-apparel", "childrens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Footwear")]: { image: local("clothing-apparel", "footwear"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Accessories & Bags")]: { image: local("clothing-apparel", "accessories-bags"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Sportswear")]: { image: local("clothing-apparel", "sportswear"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Home & Garden", "Furniture")]: { image: local("home-garden", "furniture"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Kitchen & Dining")]: { image: local("home-garden", "kitchen-dining"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Bedding & Linen")]: { image: local("home-garden", "bedding-linen"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Garden & Outdoor")]: { image: local("home-garden", "garden-outdoor"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Lighting")]: { image: local("home-garden", "lighting"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Décor & Accessories")]: { image: local("home-garden", "decor-accessories"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Health & Beauty", "Skincare")]: { image: local("health-beauty", "skincare"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Haircare")]: { image: local("health-beauty", "haircare"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Makeup & Cosmetics")]: { image: local("health-beauty", "makeup-cosmetics"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Fragrances")]: { image: local("health-beauty", "fragrances"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Health & Wellness")]: { image: local("health-beauty", "health-wellness"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Personal Care")]: { image: local("health-beauty", "personal-care"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Toys & Games", "Action Figures")]: { image: local("toys-games", "action-figures"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Board Games")]: { image: local("toys-games", "board-games"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Educational Toys")]: { image: local("toys-games", "educational-toys"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Outdoor Toys")]: { image: local("toys-games", "outdoor-toys"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Dolls & Playsets")]: { image: local("toys-games", "dolls-playsets"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Puzzles")]: { image: local("toys-games", "puzzles"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Food & Drink", "Snacks & Confectionery")]: { image: local("food-drink", "snacks-confectionery"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Beverages")]: { image: local("food-drink", "beverages"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Canned & Dry Goods")]: { image: local("food-drink", "canned-dry-goods"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Health Foods")]: { image: local("food-drink", "health-foods"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Specialty & Gourmet")]: { image: local("food-drink", "specialty-gourmet"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Seasonal")]: { image: local("food-drink", "seasonal"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Tools & DIY", "Power Tools")]: { image: local("tools-diy", "power-tools"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Hand Tools")]: { image: local("tools-diy", "hand-tools"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Plumbing")]: { image: local("tools-diy", "plumbing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Electrical")]: { image: local("tools-diy", "electrical"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Paint & Decorating")]: { image: local("tools-diy", "paint-decorating"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Fixings & Hardware")]: { image: local("tools-diy", "fixings-hardware"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Sports & Leisure", "Fitness Equipment")]: { image: download("zBYG9kzN-8s"), source: "unsplash", license: "Unsplash License" },
  [key("Sports & Leisure", "Cycling")]: { image: download("o-KAUZY2t3g"), source: "unsplash", license: "Unsplash License" },
  [key("Sports & Leisure", "Camping & Hiking")]: { image: download("QmzAMakD5Ro"), source: "unsplash", license: "Unsplash License" },
  [key("Sports & Leisure", "Water Sports")]: { image: download("4oQyKWkpYP4"), source: "unsplash", license: "Unsplash License" },
  [key("Sports & Leisure", "Team Sports")]: { image: download("FzAyjb2_Hys"), source: "unsplash", license: "Unsplash License" },
  [key("Sports & Leisure", "Leisure & Travel")]: { image: download("ZvFpMcjeQlU"), source: "unsplash", license: "Unsplash License" },

  [key("Automotive", "Car Parts")]: { image: download("J_Ymm6zw3Rg"), source: "unsplash", license: "Unsplash License" },
  [key("Automotive", "Car Accessories")]: { image: download("R8P8iZ9nRko"), source: "unsplash", license: "Unsplash License" },
  [key("Automotive", "Cleaning & Valeting")]: { image: download("pdMgepnEapo"), source: "unsplash", license: "Unsplash License" },
  [key("Automotive", "Tools & Equipment")]: { image: download("06UahhdNsdo"), source: "unsplash", license: "Unsplash License" },
  [key("Automotive", "Oils & Fluids")]: { image: download("FHR7aqLxBgQ"), source: "unsplash", license: "Unsplash License" },
  [key("Automotive", "Tyres & Wheels")]: { image: download("Bt1zFmuoT74"), source: "unsplash", license: "Unsplash License" },

  [key("Office & Stationery", "Office Furniture")]: { image: download("e5hTolfxl5A"), source: "unsplash", license: "Unsplash License" },
  [key("Office & Stationery", "Printers & Ink")]: { image: download("8r1ZlqqGxMU"), source: "unsplash", license: "Unsplash License" },
  [key("Office & Stationery", "Paper & Supplies")]: { image: download("qKMRGEqczGY"), source: "unsplash", license: "Unsplash License" },
  [key("Office & Stationery", "Office Tech")]: { image: download("g3D1s6FQYfU"), source: "unsplash", license: "Unsplash License" },
  [key("Office & Stationery", "Filing & Storage")]: { image: download("PB5-pTZE9H4"), source: "unsplash", license: "Unsplash License" },
  [key("Office & Stationery", "Pens & Writing")]: { image: download("4oyj4TxC5xI"), source: "unsplash", license: "Unsplash License" },

  [key("Baby & Nursery", "Prams & Pushchairs")]: { image: download("xdUvFN8G-7o"), source: "unsplash", license: "Unsplash License" },
  [key("Baby & Nursery", "Baby Clothing")]: { image: download("5juo633uIEc"), source: "unsplash", license: "Unsplash License" },
  [key("Baby & Nursery", "Feeding")]: { image: download("TCYj_UxoIUY"), source: "unsplash", license: "Unsplash License" },
  [key("Baby & Nursery", "Nursery Furniture")]: { image: download("jiLVuaMfgUg"), source: "unsplash", license: "Unsplash License" },
  [key("Baby & Nursery", "Toys (0-3 yrs)")]: { image: download("E1shiIGT8Oo"), source: "unsplash", license: "Unsplash License" },
  [key("Baby & Nursery", "Safety & Care")]: { image: download("q_gn4XH_r-w"), source: "unsplash", license: "Unsplash License" },

  [key("Jewellery & Watches", "Necklaces & Pendants")]: { image: download("uIiW3H_3yjM"), source: "unsplash", license: "Unsplash License" },
  [key("Jewellery & Watches", "Rings & Earrings")]: { image: download("v5V99uy_Qus"), source: "unsplash", license: "Unsplash License" },
  [key("Jewellery & Watches", "Bracelets")]: { image: download("zIrOcIv__mY"), source: "unsplash", license: "Unsplash License" },
  [key("Jewellery & Watches", "Watches")]: { image: download("KqmdTLEji08"), source: "unsplash", license: "Unsplash License" },
  [key("Jewellery & Watches", "Fashion Jewellery")]: { image: download("XGNjsoQXnqM"), source: "unsplash", license: "Unsplash License" },
  [key("Jewellery & Watches", "Accessories")]: { image: download("ZCtNONJsg-Q"), source: "unsplash", license: "Unsplash License" },

  [key("Mixed Lots", "General Mixed")]: { image: download("2mH3hbrYMac"), source: "unsplash", license: "Unsplash License" },
  [key("Mixed Lots", "Department Store Returns")]: { image: download("QdsbSlWLDf4"), source: "unsplash", license: "Unsplash License" },
  [key("Mixed Lots", "Amazon Returns")]: { image: download("RVP3wAw9gJY"), source: "unsplash", license: "Unsplash License" },
  [key("Mixed Lots", "Seasonal Mixed")]: { image: download("UmsKC3s10yM"), source: "unsplash", license: "Unsplash License" },
  [key("Mixed Lots", "High Value Mixed")]: { image: download("ekK43PCbLS0"), source: "unsplash", license: "Unsplash License" },
  [key("Mixed Lots", "Liquidation Lots")]: { image: download("F2C_mSrb6iM"), source: "unsplash", license: "Unsplash License" },

  [key("Customer Returns", "Electronics Returns")]: { image: download("cpwP43LnGRk"), source: "unsplash", license: "Unsplash License" },
  [key("Customer Returns", "Clothing Returns")]: { image: download("Wpf8uWNiu3o"), source: "unsplash", license: "Unsplash License" },
  [key("Customer Returns", "Home Returns")]: { image: download("HIjODuMuX1w"), source: "unsplash", license: "Unsplash License" },
  [key("Customer Returns", "Appliance Returns")]: { image: download("NRP0iTFLzPk"), source: "unsplash", license: "Unsplash License" },
  [key("Customer Returns", "Graded Returns")]: { image: download("DsbQdmF2Jzg"), source: "unsplash", license: "Unsplash License" },
  [key("Customer Returns", "Unchecked Returns")]: { image: download("RI_VrbUngcA"), source: "unsplash", license: "Unsplash License" },

  [key("Overstock", "Brand Overstock")]: { image: download("TXMD7u-28xM"), source: "unsplash", license: "Unsplash License" },
  [key("Overstock", "Seasonal Overstock")]: { image: download("GShBZIufldU"), source: "unsplash", license: "Unsplash License" },
  [key("Overstock", "End of Line")]: { image: download("ytMmedc6y44"), source: "unsplash", license: "Unsplash License" },
  [key("Overstock", "Excess Inventory")]: { image: download("28b8xlTT5t4"), source: "unsplash", license: "Unsplash License" },
  [key("Overstock", "Wholesale Lots")]: { image: download("VnMbc9Szs-E"), source: "unsplash", license: "Unsplash License" },
  [key("Overstock", "Bulk Deals")]: { image: download("-aCrA9FmT8Y"), source: "unsplash", license: "Unsplash License" },

  [key("Clearance Deals", "Flash Sales")]: { image: download("9huDwuMrY2M"), source: "unsplash", license: "Unsplash License" },
  [key("Clearance Deals", "Closing Down Stock")]: { image: download("pvEuBCmvgOU"), source: "unsplash", license: "Unsplash License" },
  [key("Clearance Deals", "Damaged Packaging")]: { image: download("vq6-YKhzeW0"), source: "unsplash", license: "Unsplash License" },
  [key("Clearance Deals", "Short Dated")]: { image: download("GZ0BQCskZRc"), source: "unsplash", license: "Unsplash License" },
  [key("Clearance Deals", "Sample Stock")]: { image: download("0wNXMkNnbhs"), source: "unsplash", license: "Unsplash License" },
  [key("Clearance Deals", "One-Off Deals")]: { image: download("mFUIel9hWos"), source: "unsplash", license: "Unsplash License" },
};

export const imageForSubcategory = (category: string, subcategory: string, fallback: string) =>
  subcategoryImages[key(category, subcategory)]?.image || fallback;

export const hasDedicatedSubcategoryImage = (category: string, subcategory: string) =>
  Boolean(subcategoryImages[key(category, subcategory)]);

export const duplicateDedicatedImagesWithinCategory = (category: string) => {
  const prefix = `${category}::`;
  const images = Object.entries(subcategoryImages).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v.image);
  return images.filter((value, index) => images.indexOf(value) !== index);
};

export const duplicateDedicatedImagesGlobally = () => {
  const images = Object.values(subcategoryImages).map((value) => value.image);
  return images.filter((value, index) => images.indexOf(value) !== index);
};
