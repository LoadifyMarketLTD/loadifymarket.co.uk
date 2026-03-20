import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { Building2, Users, ShieldCheck, Truck, Globe } from "lucide-react";

const AboutUs = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "About Us" }]} backTo="/" />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
            About Loadify Market
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Loadify Market is the UK's trusted multi-category marketplace connecting buyers and sellers of wholesale, clearance and overstock goods. We make it simple for businesses to trade pallets, bulk lots and end-of-line stock — all in one place.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Who We Are
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Loadify Market is operated by <strong className="text-foreground">XDrive Logistics Ltd</strong>, a UK-registered company (Co. No: 13171804, VAT: GB375949535) based in Blackburn, Lancashire. We built Loadify to solve a real problem — helping UK businesses move stock faster and find quality wholesale deals without the hassle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Our Mission
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To create the most efficient and trusted marketplace for wholesale and clearance stock trading in the UK. We believe every seller deserves real buyers, and every buyer deserves verified, quality stock at competitive prices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Who Uses Loadify
              </h2>
              <ul className="text-muted-foreground space-y-2">
                <li>• <strong className="text-foreground">Sellers</strong> — Wholesalers, liquidators, distributors and businesses with overstock, returns or clearance lines looking to shift stock quickly.</li>
                <li>• <strong className="text-foreground">Buyers</strong> — Retailers, resellers, market traders and businesses looking for bulk deals, pallets and wholesale goods at below-market prices.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Trust &amp; Safety
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Every seller on Loadify Market is verified before they can list. Payments are processed securely via Stripe, and we provide buyer protection to ensure safe transactions. We are a verified business on Google with a 5.0 rating.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                UK-Focused
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Loadify Market is built for UK businesses. All sellers are UK-based, and we offer delivery support across the United Kingdom. Our platform is designed specifically for the UK wholesale and clearance market.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 rounded-xl bg-muted/50 border border-border">
            <h3 className="font-display font-semibold text-foreground mb-2">Company Details</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">XDrive Logistics Ltd</strong></p>
              <p>Company Number: 13171804</p>
              <p>VAT Registration: GB375949535</p>
              <p>101 Cornelian Street, Blackburn BB1 9QL, UK</p>
              <p>Email: loadifymarket.co.uk@gmail.com</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs;
