import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  ShieldCheck, RotateCcw, MapPin, BadgeCheck, Lock,
  ArrowRight, Package, Layers, Sparkles,
  Flame, Clock, Truck, Tag, CheckCircle2, ArrowRightCircle, Users, Store,
} from 'lucide-react';
import CinematicHero from '../components/cinematic/CinematicHero';

// Lazy load below-the-fold components
const CinematicStoryStrip = lazy(() => import('../components/cinematic/CinematicStoryStrip'));
const TrendingProducts = lazy(() => import('../components/TrendingProducts'));

const B2B_PILLARS = [
  { name: 'Products', icon: Package, href: '/shop' },
  { name: 'Bulk Lots', icon: Package, href: '/shop?category=bulk-lots' },
  { name: 'Pallet Deals', icon: Layers, href: '/bulk' },
  { name: 'Wholesale', icon: Tag, href: '/shop?category=wholesale' },
  { name: 'Clearance', icon: Sparkles, href: '/shop?category=clearance' },
  { name: 'Logistics Loads', icon: Truck, href: '/shop?category=logistics' },
];

const TRUST_ITEMS = [
  {
    icon: Lock,
    title: 'Secure Stripe Payments',
    description: 'Stripe-powered checkout with full encryption and fraud protection on every transaction.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    description: 'All sellers are identity-verified before listing. Ratings and reviews are authentic.',
  },
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    description: 'If something goes wrong, our buyer protection policy ensures you are covered.',
  },
  {
    icon: RotateCcw,
    title: 'Returns System',
    description: 'Easy 14-day returns. Raise a return request online and track it every step of the way.',
  },
  {
    icon: MapPin,
    title: 'Order Tracking',
    description: 'Real-time order tracking from dispatch to delivery with proof-of-delivery upload.',
  },
];

const TOP_DEALS = [
  {
    id: 1,
    title: 'Electronics Mixed Pallet',
    discount: 60,
    price: 4999,
    rrp: 12500,
    tag: 'Top Deal',
    category: 'Electronics',
    location: 'Manchester',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1518770660439-4636190af475?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
  {
    id: 2,
    title: "Women's Fashion Bundle",
    discount: 64,
    price: 6499,
    rrp: 18000,
    tag: 'Hot',
    category: 'Fashion',
    location: 'London',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
  {
    id: 3,
    title: 'Home & Kitchen Appliances Lot',
    discount: 65,
    price: 3299,
    rrp: 9500,
    tag: 'New',
    category: 'Home & Garden',
    location: 'Birmingham',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
  {
    id: 4,
    title: 'Tools Wholesale Clearance',
    discount: 55,
    price: 1899,
    rrp: 4200,
    tag: 'Clearance',
    category: 'Tools',
    location: 'Leeds',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1504148455328-c376907d081c?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
  {
    id: 5,
    title: 'Vehicles Spare Parts Bulk Lot',
    discount: 50,
    price: 2499,
    rrp: 4999,
    tag: 'Bulk',
    category: 'Vehicles',
    location: 'Sheffield',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
  {
    id: 6,
    title: 'Handmade Crafts Wholesale Box',
    discount: 45,
    price: 1299,
    rrp: 2349,
    tag: 'Wholesale',
    category: 'Handmade',
    location: 'Bristol',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=70&auto=format&fit=crop&fm=webp',
    imageSrcSet: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=480&q=70&auto=format&fit=crop&fm=webp 480w, https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=768&q=70&auto=format&fit=crop&fm=webp 768w',
  },
];

const BULK_DEALS = [
  {
    id: 'b1',
    title: 'Electronics Mixed Pallet — 80+ Units',
    lotType: 'Pallet Lot',
    units: '80+ units',
    weight: '~400kg',
    price: 4999,
    rrp: 12500,
    location: 'Manchester',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=70&auto=format&fit=crop&fm=webp',
  },
  {
    id: 'b2',
    title: "Women's Fashion Clearance — 150 Garments",
    lotType: 'Clearance Lot',
    units: '150 garments',
    weight: '~180kg',
    price: 6499,
    rrp: 18000,
    location: 'London',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=70&auto=format&fit=crop&fm=webp',
  },
  {
    id: 'b3',
    title: 'Home & Kitchen Appliances Bulk Lot',
    lotType: 'Bulk Lot',
    units: '35 items',
    weight: '~250kg',
    price: 3299,
    rrp: 9500,
    location: 'Birmingham',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=70&auto=format&fit=crop&fm=webp',
  },
  {
    id: 'b4',
    title: 'Tools & Hardware Wholesale Clearance',
    lotType: 'Wholesale',
    units: '200+ pieces',
    weight: '~500kg',
    price: 1899,
    rrp: 4200,
    location: 'Leeds',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=70&auto=format&fit=crop&fm=webp',
  },
];

export default function HomePage() {
  return (
    <div className="bg-jet">
      {/* 1 — Hero */}
      <CinematicHero />

      {/* OPEN MARKETPLACE message */}
      <section className="bg-graphite/60 border-y border-white/5">
        <div className="container-cinematic py-5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-3">
              <Users className="w-3.5 h-3.5 text-gold" />
              <span className="text-gold text-xs font-medium uppercase tracking-wider">Open Marketplace</span>
            </div>
            <p className="text-white/70 text-base leading-relaxed">
              Anyone can create an account, list products, and sell directly to buyers across the UK.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm flex-wrap">
              <Link to="/register?type=seller" className="flex items-center gap-1.5 text-gold hover:underline font-semibold">
                <Store className="w-4 h-4" />
                Start Selling Free
              </Link>
              <Link to="/catalog" className="flex items-center gap-1.5 text-white/60 hover:text-gold transition-colors">
                <ArrowRight className="w-4 h-4" />
                Browse All Listings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Shop By Category */}
      <section className="py-8 md:py-10 bg-graphite/20">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                <span className="text-gold text-xs font-medium">Browse by Category</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">What are you looking for?</h2>
            </div>
            <Link to="/shop" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* B2B trade categories — 2-col mobile, 3-col tablet/desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {B2B_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Link
                  key={pillar.name}
                  to={pillar.href}
                  className="group flex flex-col items-center justify-center p-4 md:p-5 rounded-premium-md bg-graphite/60 border border-gold/20 hover:border-gold/60 hover:bg-graphite/80 transition-all duration-300 text-center"
                >
                  <div className="w-11 h-11 rounded-full bg-gold/15 flex items-center justify-center mb-3 group-hover:bg-gold/30 transition-colors">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-sm font-bold text-white leading-tight">{pillar.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 — Featured Deals */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          {/* Deal accent bar */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-px bg-red-500/30" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Tag className="w-3 h-3" /> Flash Deals — Up to 65% Off
            </span>
            <div className="flex-1 h-px bg-red-500/30" />
          </div>
          <div className="flex items-center justify-between mb-6 mt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-red-500/15 border border-red-500/20">
                <Tag className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Featured Deals</h2>
                <p className="text-white/50 text-sm">Discounted bulk &amp; pallet offers — limited time</p>
              </div>
            </div>
            <Link to="/bulk" className="text-red-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TOP_DEALS.map((deal) => (
              <Link key={deal.id} to="/bulk" className="card-product group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-graphite">
                  <img
                    src={deal.image}
                    srcSet={deal.imageSrcSet}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw"
                    alt={deal.title}
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-105 group-hover:opacity-70 transition-all duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-jet/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">-{deal.discount}%</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-bold bg-gold text-jet px-2 py-0.5 rounded-full">{deal.tag}</span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gold/70 mb-0.5 font-medium">{deal.category}</p>
                  <h3 className="font-bold text-white text-sm mb-2 line-clamp-2 leading-snug">{deal.title}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-gold">£{deal.price.toLocaleString()}</span>
                    <span className="text-xs text-white/40 line-through">£{deal.rrp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {deal.location}
                    </span>
                    <span className="flex items-center gap-1 text-gold/60">
                      <BadgeCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/bulk" className="btn-secondary inline-flex items-center gap-2 text-sm">
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4 — Trending Products */}
      <section className="py-10 md:py-14 bg-graphite/25 border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-orange-500/15 border border-orange-500/20">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Trending Products</h2>
                <p className="text-white/50 text-sm">Most viewed &amp; added to cart this week</p>
              </div>
            </div>
            <Link to="/catalog?sort=trending" className="text-orange-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View Trending <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-h-[220px]" />}>
            <TrendingProducts maxProducts={6} days={7} mode="trending" />
          </Suspense>
        </div>
      </section>

      {/* 5 — New Listings */}
      <section className="py-10 md:py-14 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-emerald-500/15 border border-emerald-500/20">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">New Listings</h2>
                <p className="text-white/50 text-sm">Latest uploads from verified sellers</p>
              </div>
            </div>
            <Link to="/catalog?sort=createdAt_desc" className="text-emerald-400 text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              View Newest <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-h-[220px]" />}>
            <TrendingProducts maxProducts={6} days={30} mode="newest" skip={6} />
          </Suspense>
        </div>
      </section>

      {/* 6 — Bulk & Pallet Deals */}
      <section className="py-10 md:py-14 bg-graphite/25 border-t border-white/5">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-premium-sm bg-gold/10 border border-gold/20">
                <Package className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Bulk &amp; Pallet Lots</h2>
                <p className="text-white/50 text-sm">Wholesale inventory — pallets, lots &amp; clearance bundles</p>
              </div>
            </div>
            <Link to="/bulk" className="text-gold text-sm font-semibold hover:underline hidden sm:flex items-center gap-1">
              All Bulk Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BULK_DEALS.map((lot) => (
              <Link key={lot.id} to="/bulk" className="group block bg-graphite/70 rounded-premium-md overflow-hidden border border-gold/10 hover:border-gold/40 hover:shadow-cinematic-gold transition-all duration-300">
                <div className="relative aspect-[16/9] overflow-hidden bg-graphite">
                  <img
                    src={lot.image}
                    alt={lot.title}
                    className="w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-60 transition-all duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-graphite/90 via-graphite/30 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="text-xs font-bold bg-gold text-jet px-2 py-0.5 rounded-sm">{lot.lotType}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm line-clamp-2 mb-3 leading-snug">{lot.title}</h3>
                  <div className="flex items-center gap-3 mb-3 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-gold/60" />
                      {lot.units}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-gold/60" />
                      {lot.weight}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-bold text-gold">£{lot.price.toLocaleString()}</span>
                      <span className="text-xs text-white/30 line-through ml-2">RRP £{lot.rrp.toLocaleString()}</span>
                    </div>
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lot.location}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                    <span className="text-xs text-gold/60 flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified Seller
                    </span>
                    <span className="text-xs text-gold font-semibold group-hover:underline flex items-center gap-1">
                      View Lot <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link to="/bulk" className="btn-primary inline-flex items-center gap-2">
              <Package className="w-5 h-5" />
              Browse All Bulk &amp; Pallet Deals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7 — Trust Section (products first, info after) */}
      <section className="py-12 md:py-16 bg-jet border-t border-white/5">
        <div className="container-cinematic">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              Why Buyers and Sellers Trust{' '}
              <span className="text-gradient-gold">Loadify Market</span>
            </h2>
            <p className="text-white/60 text-base max-w-2xl mx-auto">
              Every layer of the platform is built with buyer and seller protection in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-glass text-center hover:scale-[1.03] transition-all duration-500 group">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5 group-hover:bg-gold/20 transition-colors">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8 — How It Works */}
      <Suspense fallback={<div className="py-12 bg-jet min-h-[400px]" />}>
        <CinematicStoryStrip />
      </Suspense>

      <section className="py-12 md:py-16 bg-graphite/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px]" />
        </div>

        <div className="container-cinematic relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 mb-5">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-medium">Marketplace + Logistics Support</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              Trade Stock.{' '}
              <span className="text-gradient-gold">Arrange Delivery.</span>
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Loadify Market handles buying and selling. Delivery coordination for UK collections
              and deliveries can be arranged through our logistics partners.
            </p>
          </div>

          {/* Two-step workflow */}
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-center">
              {/* Step 1 */}
              <div className="card-glass p-6 md:p-7 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-full mb-5 mx-auto">
                  <Package className="w-7 h-7 text-gold" />
                </div>
                <div className="text-gold text-xs font-bold uppercase tracking-wider mb-2">Step 1</div>
                <h3 className="text-lg font-bold text-white mb-3">Find Stock on Loadify</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">
                  Browse products, pallets, bulk lots and wholesale stock from verified UK sellers.
                </p>
                <Link to="/shop" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Package className="w-4 h-4" />
                  Browse Marketplace
                </Link>
              </div>

              {/* Connector */}
              <div className="flex items-center justify-center px-4 py-2 md:py-0">
                <div className="flex flex-row md:flex-col items-center gap-2">
                  <div className="w-8 h-px md:w-px md:h-8 bg-gold/30" />
                  <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <ArrowRightCircle className="w-5 h-5 text-gold rotate-0 md:rotate-90" />
                  </div>
                  <div className="w-8 h-px md:w-px md:h-8 bg-gold/30" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="card-glass p-6 md:p-7 text-center border-gold/20">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-full mb-5 mx-auto">
                  <Truck className="w-7 h-7 text-gold" />
                </div>
                <div className="text-gold text-xs font-bold uppercase tracking-wider mb-2">Step 2</div>
                <h3 className="text-lg font-bold text-white mb-3">Arrange Delivery</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-5">
                  Request a transport quote for UK-wide collection and delivery of your purchased stock.
                </p>
                <Link to="/transport-quote" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                  <Truck className="w-4 h-4" />
                  Request Transport Quote
                </Link>
              </div>
            </div>

            {/* Note */}
            <p className="text-center text-white/30 text-xs mt-6">
              Transport quotes are provided by our UK-wide pallet and bulk delivery partners.
            </p>
          </div>
        </div>
      </section>

      {/* 9 — Final CTA */}
      <section className="py-12 md:py-16 bg-jet relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="container-cinematic relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-5">
              Ready to Start <span className="text-gradient-gold">Trading?</span>
            </h2>
            <p className="text-white/60 text-base mb-8">
              Buy stock. Sell products. Arrange delivery. All on Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/bulk" className="btn-primary inline-flex items-center gap-2">
                Browse Deals
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
                Start Selling
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="btn-glass inline-flex items-center gap-2">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

