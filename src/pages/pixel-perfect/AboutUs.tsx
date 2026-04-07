import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { Building2, Users, ShieldCheck, Truck, Globe } from "lucide-react";

const AboutUs = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "About Us" }]} backTo="/" />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-6">
            About Loadify Market
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Loadify Market is the UK's trusted multi-category online marketplace. Independent sellers list and manage their own inventory across electronics, fashion, home & garden, toys, handmade goods and more — while buyers browse, compare and purchase directly from sellers, all in one place.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Who We Are
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Loadify Market is operated by <strong className="text-foreground">XDrive Logistics Ltd</strong>, a UK-registered company (Co. No: 13171804, VAT: GB375949535) based in Blackburn, Lancashire. The platform does not own, store or dispatch any products — sellers are responsible for their own inventory and fulfilment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Our Mission
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To create the most efficient and trusted marketplace for physical goods in the UK — connecting independent sellers with buyers across every product category.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Who Uses Loadify
              </h2>
              <ul className="text-muted-foreground space-y-2">
                <li>• <strong className="text-foreground">Sellers</strong> — Independent UK businesses and individuals listing physical products across any category: electronics, fashion, home & garden, handmade items and more.</li>
                <li>• <strong className="text-foreground">Buyers</strong> — Consumers, retailers, resellers and businesses looking for physical goods at competitive prices across a wide range of categories.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Trust &amp; Safety
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Sellers must complete their business profile and connect a Stripe account before they can list products. Payments are processed securely via Stripe. We are a registered business on Google with a 5.0 rating.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                UK-Focused
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Loadify Market is built for UK buyers and sellers. All sellers are UK-based, and we support delivery across the United Kingdom. Our platform is designed for the UK physical goods market — from everyday items to specialist and niche products.
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
              <p>Phone: +44 7423 272138</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs;
