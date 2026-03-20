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
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Platform Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Everything You Need to Trade
          </h2>
          <p className="mt-4 text-muted-foreground">
            A complete marketplace platform built for wholesale and clearance stock trading in the UK.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-hero group-hover:text-primary-foreground transition-colors">
                <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
