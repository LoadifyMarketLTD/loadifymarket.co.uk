import { Package, ShieldCheck, Zap, BarChart3, Truck, CreditCard } from "lucide-react";

const features = [
  {
    icon: Package,
    color: "text-blue-600 bg-blue-50",
    title: "Multi-Vendor Marketplace",
    description: "Multiple verified sellers listing wholesale stock and clearance goods in one unified platform.",
  },
  {
    icon: Zap,
    color: "text-amber-600 bg-amber-50",
    title: "Buy & Sell Faster",
    description: "Streamlined listing and purchasing flow so buyers and sellers can move stock quickly and efficiently.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-600 bg-emerald-50",
    title: "Verified Sellers",
    description: "Every seller is vetted and approved before they can list. Trade with confidence on a trusted marketplace.",
  },
  {
    icon: CreditCard,
    color: "text-violet-600 bg-violet-50",
    title: "Secure Payments",
    description: "Integrated Stripe payments with buyer protection and transparent transaction tracking.",
  },
  {
    icon: Truck,
    color: "text-sky-600 bg-sky-50",
    title: "Logistics Support",
    description: "Delivery coordination between buyers and sellers with shipment tracking and proof-of-delivery.",
  },
  {
    icon: BarChart3,
    color: "text-rose-600 bg-rose-50",
    title: "Seller & Buyer Dashboards",
    description: "Dedicated dashboards for sellers to manage listings and for buyers to track orders and manage accounts.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1A4080]">Platform Features</span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#0F2D52]">
            Why Choose Loadify Market
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            A complete marketplace platform built for wholesale and clearance stock trading in the UK.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[#0F2D52] mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
