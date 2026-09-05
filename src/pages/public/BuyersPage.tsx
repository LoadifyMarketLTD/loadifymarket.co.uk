import { Link } from "react-router-dom";
import { ArrowRight, Heart, MapPin, MessageSquare, PackageSearch, ShoppingCart, Star, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const features = [
  { icon: PackageSearch, eyebrow: "DISCOVER", title: "Discover products", copy: "Browse the marketplace through catalogue, category and product pages, with search designed to help you move from discovery to a product decision." },
  { icon: ShoppingCart, eyebrow: "CHECKOUT", title: "Purchase through Loadify", copy: "Build your cart and complete a Stripe-backed marketplace checkout through Loadify." },
  { icon: Truck, eyebrow: "TRACK", title: "Follow your orders", copy: "Use order history and tracking information to keep marketplace purchases visible after checkout." },
  { icon: Heart, eyebrow: "SAVE", title: "Save what matters", copy: "Buyer Space includes wishlist and favourites functionality so useful products are easier to return to." },
  { icon: MapPin, eyebrow: "ACCOUNT", title: "Manage account details", copy: "Keep addresses, profile information, settings and buyer account activity organised in one environment." },
  { icon: MessageSquare, eyebrow: "CONNECT", title: "Stay connected", copy: "Notifications, messages and dispute-related workflows provide structured paths for marketplace communication and support." },
] as const;

export default function BuyersPage() {
  return (
    <MainLayout>
      <SEO title="Buy on Loadify Market | Buyer Marketplace & Order Management" description="Browse products, checkout through Loadify Market and manage orders, tracking, favourites, reviews and account activity from Buyer Space." canonical="/buyers" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">For buyers</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Buy products online and manage marketplace orders in one place.</h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Browse products through Loadify Market, complete supported checkout and keep orders, tracking, favourites and account activity connected through Buyer Space.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/catalog" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Browse marketplace products <ArrowRight className="h-4 w-4" /></Link><Link to="/register?type=buyer" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Create buyer account</Link></div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">BUYER JOURNEY</p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">From product discovery to account management.</h2>
                <div className="mt-6 space-y-4">{["Discover products", "Choose and checkout", "Follow the order", "Manage account activity", "Review or use support paths"].map((item,index)=><div key={item} className="flex items-center gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs font-black text-[#F5A300]">{index+1}</span><span className="text-sm font-extrabold text-white">{item}</span></div>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Buyer Space</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">The marketplace does not end at checkout.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{features.map(({icon:Icon,eyebrow,title,copy})=><article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div></div></section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20"><div className="mx-auto grid max-w-[1280px] gap-8 px-5 sm:px-7 lg:grid-cols-2 lg:items-center lg:px-10"><div><Star className="h-6 w-6 text-[#8A7351]" /><h2 className="mt-5 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Buying for a business?</h2><p className="mt-4 text-sm leading-7 text-[#667085]">Loadify also has a dedicated trade-account registration path for sole traders, companies, partnerships, charities and other organisations.</p></div><div className="lg:text-right"><Link to="/trade" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Explore Trade <ArrowRight className="h-4 w-4" /></Link></div></div></section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7"><h2 className="mx-auto max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Ready to explore marketplace products?</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Start with the catalogue, then create a buyer account when you are ready to manage your marketplace activity.</p><Link to="/catalog" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Browse Loadify Market <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </MainLayout>
  );
}
