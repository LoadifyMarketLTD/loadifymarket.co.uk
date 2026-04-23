import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import { Link } from "react-router-dom";
import {
  PackageSearch,
  ShieldCheck,
  Truck,
  BadgePercent,
  Users,
  HelpCircle,
  Store,
  Phone,
} from "lucide-react";

const WholesaleInfo = () => {
  return (
    <MainLayout>
      <main id="main-content" className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Marketplace Information" },
            ]}
            backTo="/"
          />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Marketplace Information
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Loadify Market is a multi-category online marketplace connecting UK sellers and
            buyers. Whether you sell individual items or bulk stock, buy one unit or a full
            pallet — there are no restrictions on what you can list or purchase. This page
            explains how the platform works for both buyers and sellers.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                What Can You Buy on Loadify Market?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Loadify Market carries products across every major category — from single
                consumer items to bulk case packs, pallets and job lots. Buyers can purchase
                at any quantity. There is no requirement to buy in bulk and no minimum order
                set by the platform. Each seller sets their own terms, prices and quantities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Who Can Buy?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Any registered buyer can purchase from any listing on Loadify Market.
                There are no trade-only restrictions. Common buyer types include:
              </p>
              <ul className="text-muted-foreground space-y-2 ml-4">
                <li>• Individual consumers buying single items</li>
                <li>• Retailers and resellers sourcing stock in bulk</li>
                <li>• Online sellers on eBay, Amazon or their own store</li>
                <li>• Market traders and small businesses</li>
                <li>• Charities and organisations purchasing supplies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Selling on Loadify Market
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Any UK-based individual or business can sell on Loadify Market — across any
                product category and at any quantity. To start selling:
              </p>
              <ol className="text-muted-foreground space-y-2 ml-4 list-decimal list-inside">
                <li>
                  <Link to="/register?type=seller" className="text-primary underline">
                    Create a seller account
                  </Link>{" "}
                  and complete your business profile.
                </li>
                <li>Connect your Stripe account for secure payment processing.</li>
                <li>
                  List your products — set your own prices, quantities and delivery terms.
                  You can sell single items, multipacks, job lots or full pallets.
                </li>
                <li>
                  Once your profile is verified, your listings go live and are visible to
                  all buyers on the platform immediately.
                </li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-3">
                A{" "}
                <strong className="text-foreground">
                  7% marketplace commission
                </strong>{" "}
                applies to completed sales (0% Commission during the launch promotion until 31 December 2026). There are no monthly fees or listing charges.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                Pricing and Orders
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Sellers set their own prices and can offer volume discounts or tiered pricing.
                Buyers can purchase any quantity available. All transactions are processed in
                GBP through Stripe — no off-platform payments are permitted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Delivery and Fulfilment
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Delivery is arranged directly between the seller and buyer. Each seller
                specifies their own dispatch timeframes, delivery services and any delivery
                charges in their listings. Buyers should review the delivery terms on each
                listing before purchasing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Buyer Protection
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All payments on Loadify Market are processed securely through Stripe. If an
                order is not fulfilled as described, buyers can raise a dispute through the
                platform. Sellers are required to provide accurate descriptions, comply with
                UK trading laws, and respond to buyer enquiries within 48 hours.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-5">
                {[
                  {
                    q: "Do I need a business account to buy?",
                    a: "No. Any registered buyer can purchase from any listing. There are no trade or business requirements imposed by the platform.",
                  },
                  {
                    q: "Can I request a quote before ordering?",
                    a: "Yes. Use the Request for Quote (RFQ) feature to post your requirements and receive quotes from suppliers on the platform.",
                  },
                  {
                    q: "Are all sellers UK-based?",
                    a: "Yes. Loadify Market operates in the UK. All sellers are UK-based and all deliveries are within the United Kingdom.",
                  },
                  {
                    q: "What categories are available?",
                    a: "All major product categories are available including homeware, electronics, clothing, toys, sports, gardening, pets, food, health and beauty, automotive, and more.",
                  },
                  {
                    q: "How do I contact a seller before buying?",
                    a: "Each product listing includes a seller profile page. You can use the platform's contact or RFQ feature to send enquiries directly to sellers.",
                  },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <h3 className="font-medium text-foreground mb-1">{q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Need Help?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have a question that is not covered here, our support team is happy
                to help. Visit our{" "}
                <Link to="/contact" className="text-primary underline">
                  Contact Us
                </Link>{" "}
                page or browse the{" "}
                <Link to="/faq" className="text-primary underline">
                  FAQ
                </Link>{" "}
                for more information. Sellers can also review the{" "}
                <Link to="/seller-guidelines" className="text-primary underline">
                  Seller Guidelines
                </Link>{" "}
                for platform rules and best practices.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 rounded-xl bg-muted/50 border border-border">
            <h3 className="font-display font-semibold text-foreground mb-2">
              Ready to get started?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse products now or register as a seller to start listing.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Browse Products
              </Link>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default WholesaleInfo;
