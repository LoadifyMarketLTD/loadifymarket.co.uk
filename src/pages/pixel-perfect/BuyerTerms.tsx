import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { useMarket } from "@/contexts/MarketContext";
import { RomaniaBuyerTerms } from "@/components/legal/RomaniaLegalContent";

const BuyerTerms = () => {
  const { market } = useMarket();
  if (market === "RO") {
    return (
      <MainLayout>
        <SEO title="Termeni pentru cumpărători | Loadify Market" description="Informații juridice pentru utilizatorii Loadify Market din România." canonical="/buyer-terms" />
        <main id="main-content" className="pt-4 md:pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-4xl"><RomaniaBuyerTerms /></div>
        </main>
      </MainLayout>
    );
  }
  return (
    <MainLayout>
      <SEO title="Buyer Terms | Loadify Market" description="Read the buyer terms that apply to purchases from independent marketplace sellers and approved suppliers." canonical="/buyer-terms" />
      <main id="main-content" className="pt-4 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Buyer Terms" }]} backTo="/" />
        </div>
        <div className="legal-content">
          <h1>Buyer Terms</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 25 September 2026</p>

          <p>These Buyer Terms apply to users who purchase goods through Loadify Market ("Platform"), operated by XDrive Logistics Ltd (Company No: 13171804, VAT: GB375949535). They supplement our general <a href="/terms">Terms &amp; Conditions</a>.</p>

          <p><strong>The seller of record is the independent seller or approved supplier identified for the applicable product and order.</strong> Loadify Market operates the marketplace platform and does not own or pre-purchase the goods. Please review the seller/supplier identity, delivery information, return terms and product information before ordering.</p>

          <h2>1. Account &amp; Eligibility</h2>
          <p>To purchase on Loadify Market, you must:</p>
          <ul>
            <li>Be at least 18 years of age</li>
            <li>Create a buyer account with accurate information</li>
            <li>Agree to these Buyer Terms and our general Terms &amp; Conditions</li>
          </ul>

          <h2>2. Purchasing</h2>
          <p>When you place an order on the Platform:</p>
          <ul>
            <li>For a Marketplace Seller product, you contract directly with the independent seller identified for that order</li>
            <li>For an Approved Supplier Marketplace product, you contract with the independent supplier identified for that product or order</li>
            <li>You agree to pay the displayed product price, delivery and any other mandatory amount shown before payment</li>
            <li>Orders are confirmed only after the applicable payment and order-state checks succeed</li>
          </ul>

          <h2>3. Payment</h2>
          <p>Payments are processed securely through Stripe. Loadify may facilitate the marketplace payment workflow for independent sellers and suppliers, but payment processing does not make Loadify the owner or supplier of the goods. Loadify does not store full card details.</p>
          <p>You agree to provide valid payment details and not to initiate fraudulent or abusive chargebacks. Raising a legitimate card dispute or exercising statutory rights is not prohibited.</p>

          <h2>4. Buyer Responsibilities</h2>
          <p>As a buyer, you agree to:</p>
          <ul>
            <li>Provide accurate delivery and contact information</li>
            <li>Be available to receive deliveries or follow the applicable carrier instructions</li>
            <li>Inspect goods after delivery and report issues promptly</li>
            <li>Use the correct seller or Loadify support route shown for the order</li>
            <li>Not misuse the Platform or engage in fraudulent activity</li>
          </ul>

          <h2>5. Returns &amp; Refunds</h2>
          <p>Marketplace Seller returns are handled under the independent seller's applicable terms and law. Approved Supplier Marketplace returns remain the responsibility of the independent supplier under the applicable terms and law, while Loadify may provide the return-request workflow, evidence exchange and support escalation. See our <a href="/returns-policy">Returns Policy</a>.</p>
          <p>A cancellation request does not itself cancel an order. The order remains active until the responsible seller-of-record confirms the applicable cancellation and refund state. After packing or dispatch has started, the applicable return process may need to be used instead.</p>

          <h2>6. Reviews &amp; Feedback</h2>
          <p>You may leave reviews and ratings for eligible transactions. Reviews must be:</p>
          <ul>
            <li>Honest, accurate and based on genuine transactions</li>
            <li>Free from offensive, defamatory or misleading content</li>
            <li>Not used to harass, intimidate or extort another user or business</li>
          </ul>
          <p>We reserve the right to remove reviews that violate these standards.</p>

          <h2>7. Disputes</h2>
          <p>For a Marketplace Seller or Approved Supplier Marketplace order, buyers should use the order's seller/supplier-contact, return or dispute route. Loadify may provide platform support, investigate evidence and coordinate the workflow, but the independent seller or supplier remains the commercial party responsible for the goods.</p>

          <h2>8. Account Suspension</h2>
          <p>We may suspend or terminate a buyer account if the user:</p>
          <ul>
            <li>Violates these Buyer Terms or our general Terms &amp; Conditions</li>
            <li>Engages in fraudulent or abusive behaviour</li>
            <li>Repeatedly misuses payment, return, review or dispute systems</li>
          </ul>

          <h2>9. Liability and Consumer Rights</h2>
          <p>Nothing in these Buyer Terms limits statutory consumer rights or liability that cannot lawfully be limited. The independent Marketplace Seller or approved supplier identified for the order is responsible for the goods as seller of record. Loadify remains responsible for its own marketplace-platform acts, omissions and legal obligations.</p>

          <h2>10. Contact</h2>
          <p>For buyer-related queries:</p>
          <ul>
            <li>Email: contact@loadifymarket.co.uk</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
    </MainLayout>
  );
};

export default BuyerTerms;