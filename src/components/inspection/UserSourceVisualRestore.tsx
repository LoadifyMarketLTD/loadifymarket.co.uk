import { Link } from 'react-router-dom';

const reserveRaw = 'https://raw.githubusercontent.com/LoadifyMarketLTD/focused-image-craft/main/src/assets';

const categories = [
  ['Electronics & Technology','electronics.jpg',['Phones & Tablets','Laptops & PCs','TV & Audio','Gaming Consoles','Accessories','Smart Home']],
  ['Clothing & Apparel','clothing.jpg',["Men's Clothing","Women's Clothing","Children's Clothing",'Footwear','Accessories & Bags','Sportswear']],
  ['Home & Garden','home.jpg',['Furniture','Kitchen & Dining','Bedding & Linen','Garden & Outdoor','Lighting','Décor & Accessories']],
  ['Health & Beauty','health-beauty.jpg',['Skincare','Haircare','Makeup & Cosmetics','Fragrances','Health & Wellness','Personal Care']],
  ['Toys & Games','toys.jpg',['Action Figures','Board Games','Educational Toys','Outdoor Toys','Dolls & Playsets','Puzzles']],
  ['Food & Drink','food-drink.jpg',['Snacks & Confectionery','Beverages','Canned & Dry Goods','Health Foods','Specialty & Gourmet','Seasonal']],
  ['Tools & DIY','tools.jpg',['Power Tools','Hand Tools','Plumbing','Electrical','Paint & Decorating','Fixings & Hardware']],
  ['Sports & Leisure','sports.jpg',['Fitness Equipment','Cycling','Camping & Hiking','Water Sports','Team Sports','Leisure & Travel']],
  ['Automotive','automotive.jpg',['Car Parts','Car Accessories','Cleaning & Valeting','Tools & Equipment','Oils & Fluids','Tyres & Wheels']],
  ['Office & Stationery','office.jpg',['Office Furniture','Printers & Ink','Paper & Supplies','Office Tech','Filing & Storage','Pens & Writing']],
  ['Baby & Nursery','baby.jpg',['Prams & Pushchairs','Baby Clothing','Feeding','Nursery Furniture','Toys (0-3 yrs)','Safety & Care']],
  ['Jewellery & Watches','jewellery.jpg',['Necklaces & Pendants','Rings & Earrings','Bracelets','Watches','Fashion Jewellery','Accessories']],
  ['Mixed Lots','mixed-pallets.jpg',['General Mixed','Department Store Returns','Amazon Returns','Seasonal Mixed','High Value Mixed','Liquidation Lots']],
  ['Customer Returns','returns.jpg',['Electronics Returns','Clothing Returns','Home Returns','Appliance Returns','Graded Returns','Unchecked Returns']],
  ['Overstock','overstock.jpg',['Brand Overstock','Seasonal Overstock','End of Line','Excess Inventory','Wholesale Lots','Bulk Deals']],
  ['Clearance Deals','clearance.jpg',['Flash Sales','Closing Down Stock','Damaged Packaging','Short Dated','Sample Stock','One-Off Deals']],
] as const;

export default function UserSourceVisualRestore() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#0b1b3a]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center gap-8 px-5">
          <Link to="/" className="flex items-center gap-3 font-extrabold text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#165dcc] text-white">L</span>
            <span>Loadify <span className="text-[#165dcc]">Market</span></span>
          </Link>
          <div className="hidden flex-1 md:block">
            <div className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-slate-500">Search products, categories...</div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <Link to="/catalog">Catalog</Link><a href="#categories">Deals</a><a href="#categories">Categories</a><Link to="/contact">Contact</Link><Link to="/about">About</Link>
          </nav>
          <Link to="/login" className="text-sm font-semibold">Sign In</Link>
          <Link to="/signup" className="rounded-xl bg-[#165dcc] px-5 py-3 text-sm font-bold text-white shadow-sm">Get Started</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-[1280px] px-5 pt-8">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <img src={`${reserveRaw}/hero-warehouse.jpg`} alt="Wholesale warehouse with palletised stock" className="h-[360px] w-full object-cover lg:h-[430px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/72 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-[650px] flex-col justify-center px-8 sm:px-12 lg:px-16">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#165dcc]">UK wholesale marketplace</p>
              <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">Buy wholesale stock.<br/><span className="text-[#165dcc]">Sell to real buyers.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Wholesale, clearance, overstock and bulk opportunities presented in a bright, structured marketplace built for UK buyers and sellers.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Link to="/catalog" className="rounded-xl bg-[#165dcc] px-6 py-3.5 font-bold text-white">Browse Marketplace</Link><Link to="/signup" className="rounded-xl bg-[#0f9f6e] px-6 py-3.5 font-bold text-white">Start Selling</Link></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-8">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {['Verified Sellers','Secure Platform','UK Delivery Support','Free to Join'].map((x)=><div key={x} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 font-black text-[#165dcc]">✓</span><div><div className="font-bold">{x}</div><div className="text-xs text-slate-500">Built for a trusted marketplace experience</div></div></div>)}
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-[1280px] px-5 pb-16 pt-5">
          <div className="mb-8 text-center"><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#165dcc]">Explore the marketplace</p><h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Browse by Category</h2><p className="mx-auto mt-3 max-w-2xl text-slate-500">The exact bright, visual category-first direction supplied for inspection.</p></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map(([title,img,subs]) => (
              <article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                <img src={`${reserveRaw}/categories/${img}`} alt={`${title} category`} className="h-44 w-full object-cover" />
                <div className="p-5"><h3 className="text-lg font-extrabold">{title}</h3><div className="mt-4 grid gap-2 text-sm text-slate-600">{subs.map(s=><div key={s}>{s}</div>)}</div><div className="mt-5 font-bold text-[#165dcc]">View All →</div></div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
