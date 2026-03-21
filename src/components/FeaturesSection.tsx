import { Package, ShieldCheck, Zap, BarChart3, Truck, CreditCard } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Multi-Vendor Marketplace",
    description: "Multiple verified sellers listing wholesale stock and clearance goods in one unified platform.",
  },
  {
    icon: Zap,
    title: "Buy & Sell Faster",
    description: "Streamlined listing and purchasing flow so buyers and sellers can move stock quickly and efficiently.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Sellers",
    description: "Every seller is vetted and approved before they can list. Trade with confidence on a trusted marketplace.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Integrated Stripe payments with buyer protection and transparent transaction tracking.",
  },
  {
    icon: Truck,
    title: "Logistics Support",
    description: "Delivery coordination between buyers and sellers with shipment tracking and proof-of-delivery.",
  },
  {
    icon: BarChart3,
    title: "Seller & Buyer Dashboards",
    description: "Dedicated dashboards for sellers to manage listings and for buyers to track orders and manage accounts.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-9">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Platform Features</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-display font-bold text-foreground">
            Everything You Need to Trade
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A complete marketplace platform built for wholesale and clearance stock trading in the UK.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card rounded-lg p-3.5 shadow-card hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
            >
              <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-gradient-hero group-hover:text-primary-foreground transition-colors">
                <feature.icon className="h-3.5 w-3.5 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
