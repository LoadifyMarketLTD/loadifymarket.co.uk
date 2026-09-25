import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { useMarket } from "@/contexts/MarketContext";
import { RomaniaReturnsPolicy } from "@/components/legal/RomaniaLegalContent";

const ReturnsPolicy = () => {
  const { market } = useMarket();
  if (market === "RO") {
    return (
      <MainLayout>
        <SEO title="Politica de retur | Loadify Market" description="Informații juridice pentru utilizatorii Loadify Market din România." canonical="/returns-policy" />
        <main id="main-content" className="pt-4 md:pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-4xl"><RomaniaReturnsPolicy /></div>
        </main>
      </MainLayout>
    );
  }
  return (
    <MainLayout>
      <SEO title="Returns Policy | Loadify Market" description="Understand returns and refunds for purchases from independent marketplace sellers and approved suppliers." canonical="/returns-policy" />
      <main id="main-content" className="pt-4 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Returns Policy" }]} backTo="/" />
        </div>
        <div className="legal-content">
          <h1>Returns Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 25 September 2026</p>

          <p>This Returns Policy explains how returns and refunds are handled on Loadify Market, operated by XDrive Logistics Ltd (Company No: 13171804).</p>
          <p><strong>The return route depends on the independent seller or approved supplier responsible for the order.</strong> Loadify provides the marketplace return-request and support workflow but does not become the owner or seller of the goods.</p>

          <h2>1. Marketplace Seller Returns</h2>
          <p>For a product sold by an independent Marketplace Seller, that seller's return terms apply subject to applicable law and Platform rules. The seller is responsible for the goods as seller of record. Buyers should use the order's seller-contact, return or dispute route.</p>

          <h2>2. Approved Supplier Marketplace Returns</h2>
          <p>For an approved supplier product, the independent supplier identified for the order remains the seller of record and is responsible for the applicable return and refund obligations. Supplier-held stock never becomes Loadify inventory.</p>
          <p>Buyers may submit the return or cancellation through the Loadify order flow. Loadify can route the request, retain evidence and provide support escalation, while return instructions may direct the goods to the responsible supplier or its authorised return location.</p>

          <h2>3. Consumer Rights</h2>
          <p>Where UK consumer law applies, statutory cancellation and product-quality rights are not reduced by this policy. Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, eligible distance-sale consumers generally have 14 days after receiving goods to notify the seller of cancellation, subject to statutory exceptions.</p>
          <p>If a paid order has not yet entered packing or dispatch, a buyer may submit a cancellation request. A request is not confirmation of cancellation: the order remains active until the seller of record confirms the applicable order state and refund. Once packing or dispatch has started, the applicable return process may need to be used instead.</p>

          <h2>4. Return Conditions</h2>
          <p>Where the statutory cancellation right applies, goods should normally be returned within the applicable legal timeframe and handled no more than necessary to establish their nature, characteristics and functioning. Original packaging should be used where reasonably possible.</p>
          <p>The buyer may be responsible for return postage where the law and the disclosed return terms allow it. Faulty, misdescribed or otherwise non-conforming goods are handled under the applicable statutory rules.</p>

          <h2>5. Exceptions</h2>
          <p>Statutory cancellation rights may not apply to categories such as:</p>
          <ul>
            <li>Goods made to the consumer's specifications or clearly personalised</li>
            <li>Sealed goods not suitable for return for health-protection or hygiene reasons once unsealed</li>
            <li>Goods liable to deteriorate or expire rapidly</li>
            <li>B2B transactions where the purchaser is not acting as a consumer</li>
          </ul>

          <h2>6. Faulty or Misdescribed Goods</h2>
          <p>Where the Consumer Rights Act 2015 applies, goods must meet the applicable statutory standards, including being as described, of satisfactory quality and fit for purpose. Available remedies depend on the circumstances and timing of the claim.</p>

          <h2>7. Refund Process</h2>
          <p>The independent seller or approved supplier is responsible for the refund entitlement under the applicable terms and law. Loadify may facilitate the platform and Stripe refund workflow, maintain transaction records and support evidence exchange, but this facilitation does not transfer ownership of the goods or seller-of-record responsibility to Loadify.</p>
          <p>After Stripe confirms a refund, the buyer's bank or card issuer may take additional business days to display it.</p>

          <h2>8. Disputes</h2>
          <p>If an issue cannot be resolved directly with the independent seller or approved supplier, the buyer may escalate it through Loadify support. Loadify may investigate platform evidence and coordinate the dispute workflow without replacing the responsible seller or supplier.</p>

          <h2>9. Large &amp; B2B Orders</h2>
          <p>B2B purchases and negotiated large orders may be subject to different contractual return terms. Statutory consumer cancellation rights do not automatically apply where the buyer is acting wholly or mainly for business purposes.</p>

          <h2>10. Contact</h2>
          <p>For return-related support:</p>
          <ul>
            <li>Email: contact@loadifymarket.co.uk</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
    </MainLayout>
  );
};

export default ReturnsPolicy;