import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RestoredTrustSection() {
  return (
    <section className="border-y border-border bg-muted/40 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-6 text-sm text-muted-foreground sm:flex-row sm:gap-10">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span>UK-operated marketplace</span></div>
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /><span>Stripe-powered checkout</span></div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span>Buyer & seller accounts</span></div>
        </div>
      </div>
    </section>
  );
}

const sellerBenefits = [
  { icon: ShoppingBag, title: "Reach marketplace buyers", description: "Publish approved listings into the same marketplace buyers use to browse and purchase products." },
  { icon: Package, title: "Manage your catalogue", description: "Create and maintain product listings, stock and fulfilment information from your seller workspace." },
  { icon: BarChart3, title: "Manage orders in one place", description: "Follow marketplace orders and the operational steps attached to your seller account." },
  { icon: CreditCard, title: "Connected payment readiness", description: "Seller payment readiness is connected to the platform's current Stripe onboarding and eligibility controls." },
];

export function RestoredWhySellSection() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">For Sellers</span>
          <h2 className="mt-3 text-3xl font-display font-bold text-foreground sm:text-4xl">Build Your Marketplace Presence</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Use one Loadify seller identity to manage listings, marketplace orders and eligible payment setup.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {sellerBenefits.map((benefit) => (
            <div key={benefit.title} className="flex gap-4 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/20 hover:shadow-elevated">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10"><benefit.icon className="h-5 w-5 text-primary" /></div>
              <div><h3 className="mb-1 font-display font-semibold text-foreground">{benefit.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p></div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" className="bg-emerald-600 px-8 text-base font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700" asChild>
            <Link to="/register?type=seller">Start Selling <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Package, title: "Multi-category marketplace", description: "Browse and manage marketplace listings across the active Loadify catalogue." },
  { icon: Zap, title: "Connected buyer and seller journeys", description: "Public discovery, account creation and marketplace workflows share the same current platform contracts." },
  { icon: ShieldCheck, title: "Governed marketplace access", description: "Account, seller and listing eligibility are enforced by the current platform controls." },
  { icon: CreditCard, title: "Stripe-powered checkout", description: "Checkout uses the platform's current server-authoritative Stripe payment boundary." },
  { icon: Store, title: "Seller workspace", description: "Sellers manage profile readiness, listings, orders and related marketplace operations." },
  { icon: BarChart3, title: "Buyer workspace", description: "Buyers can manage orders, account details and supported marketplace actions from their own workspace." },
];

export function RestoredFeaturesSection() {
  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Platform Features</span>
          <h2 className="mt-3 text-3xl font-display font-bold text-foreground sm:text-4xl">One Marketplace, Connected Workflows</h2>
          <p className="mt-4 text-muted-foreground">The visual experience is being restored without replacing the current Loadify runtime contracts.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/20 hover:shadow-elevated">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-gradient-hero"><feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" /></div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RestoredStatsSection() {
  return (
    <section className="bg-gradient-hero py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-6 text-sm text-primary-foreground/80 sm:flex-row sm:gap-12">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /><span>UK operated</span></div>
          <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-accent" /><span>Stripe-powered payments</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-accent" /><span>Buyer & seller workspaces</span></div>
        </div>
      </div>
    </section>
  );
}

export function RestoredHowItWorksSection() {
  const buyerSteps = ["Browse current marketplace listings", "Choose a product and review listing details", "Complete the supported checkout flow"];
  const sellerSteps = ["Create a seller account", "Complete seller readiness requirements", "Publish eligible listings and manage orders"];
  return (
    <section className="bg-muted/50 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center"><span className="text-sm font-semibold uppercase tracking-wider text-primary">How It Works</span><h2 className="mt-3 text-3xl font-display font-bold text-foreground sm:text-4xl">Built for Buyers and Sellers</h2></div>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {[{ title: "For Buyers", icon: ShoppingBag, steps: buyerSteps }, { title: "For Sellers", icon: Store, steps: sellerSteps }].map((flow) => (
            <div key={flow.title} className="rounded-2xl border border-border bg-card p-7 shadow-card">
              <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10"><flow.icon className="h-5 w-5 text-primary" /></div><h3 className="font-display text-xl font-bold text-foreground">{flow.title}</h3></div>
              <ol className="space-y-5">{flow.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><span className="pt-1 text-sm leading-relaxed text-muted-foreground">{step}</span></li>)}</ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RestoredCTASection() {
  return (
    <section className="bg-muted/50 py-24">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-12 text-center sm:p-16">
          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-display font-bold text-primary-foreground sm:text-4xl">Ready to Use Loadify Market?</h2>
            <p className="text-lg text-primary-foreground/80">Browse the current marketplace or create the account that matches how you want to use the platform.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="bg-gradient-accent px-8 text-base font-semibold text-accent-foreground hover:opacity-90" asChild><Link to="/catalog">Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" asChild><Link to="/register">Create Account</Link></Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
