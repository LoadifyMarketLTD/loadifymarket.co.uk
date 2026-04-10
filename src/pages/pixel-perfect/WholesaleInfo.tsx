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
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "UK Wholesale Information and Support" },
            ]}
            backTo="/"
          />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            UK Wholesale Information and Support
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Loadify Market connects UK wholesale suppliers with buyers across every product
            category. Whether you are a business looking to source stock in bulk or a
            supplier wanting to reach more buyers, this page covers everything you need to
            know about wholesale trading on our platform.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                What Is Wholesale on Loadify Market?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Wholesale listings on Loadify Market are bulk-quantity product offers sold
                by verified UK suppliers. Items are typically sold in case packs, pallets or
                job lots at trade prices, making the platform ideal for retailers, resellers,
                market traders and small businesses looking to source stock competitively.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Who Can Buy Wholesale?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Any registered buyer on Loadify Market can purchase wholesale listings.
                There is no minimum order requirement imposed by the platform — each seller
                sets their own minimum quantities and pricing tiers. Common buyer types
                include:
              </p>
              <ul className="text-muted-foreground space-y-2 ml-4">
                <li>• Retail shop owners stocking their shelves</li>
                <li>• Online resellers and eBay / Amazon traders</li>
                <li>• Market stall holders and car boot sellers</li>
                <li>• Small businesses sourcing supplies or consumables</li>
                <li>• Charities and community organisations buying in bulk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Selling Wholesale on Loadify Market
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                UK wholesale suppliers can list their products and reach thousands of trade
                buyers without paying upfront listing fees. To start selling:
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
                  List your wholesale products — set your own prices, minimum quantities
                  and delivery terms.
                </li>
                <li>
                  Once your profile is verified, your listings go live immediately and are
                  visible to all buyers on the platform.
                </li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-3">
                A{" "}
                <strong className="text-foreground">
                  7% marketplace commission
                </strong>{" "}
                applies to completed sales (0% during the launch promotion until 31 August
                2026). There are no monthly fees or listing charges.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                Pricing and Minimum Orders
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Sellers are free to set their own wholesale prices, minimum order quantities
                (MOQ) and volume discount tiers. Prices must accurately reflect the goods
                being offered. All transactions are processed in GBP through Stripe — no
                off-platform payments are permitted.
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
                charges in their listings. For large or palletised wholesale orders, sellers
                typically use pallet courier networks. Buyers should review the delivery
                terms on each listing before purchasing.
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
                UK consumer and business-to-business trading laws, and respond to buyer
                enquiries within 48 hours.
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
                    q: "Do I need a VAT number to buy wholesale?",
                    a: "No. There is no requirement to be VAT-registered to purchase wholesale on Loadify Market. However, some sellers may request a VAT number for their own records — this is between the buyer and seller.",
                  },
                  {
                    q: "Can I request a quote before ordering?",
                    a: "Yes. Use the Request for Quote (RFQ) feature to post your requirements and receive quotes from multiple wholesale suppliers on the platform.",
                  },
                  {
                    q: "Are all sellers UK-based?",
                    a: "Yes. Loadify Market is a UK-only platform. All sellers are UK-based businesses or individuals, and all deliveries are within the United Kingdom.",
                  },
                  {
                    q: "What categories of wholesale goods are available?",
                    a: "Wholesale products span all major categories including homeware, cleaning supplies, toys, gardening, electrical, clothing, pet supplies, stationery, seasonal goods and more.",
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
              Browse wholesale products now or register as a supplier to start selling.
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
