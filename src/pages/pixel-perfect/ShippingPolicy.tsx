import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { useMarket } from "@/contexts/MarketContext";
import { RomaniaShippingPolicy } from "@/components/legal/RomaniaLegalContent";

const ShippingPolicy = () => {
  const { market } = useMarket();
  if (market === "RO") {
    return (
      <MainLayout>
        <SEO title="Politica de livrare | Loadify Market" description="Informații juridice pentru utilizatorii Loadify Market din România." canonical="/shipping-policy" />
        <main id="main-content" className="pt-4 md:pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-4xl"><RomaniaShippingPolicy /></div>
        </main>
      </MainLayout>
    );
  }
  return (
    <MainLayout>
      <SEO title="Shipping Policy | Loadify Market" description="Learn how shipping works for orders from independent marketplace sellers and approved suppliers." canonical="/shipping-policy" />
      <main id="main-content" className="pt-4 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Shipping Policy" }]} backTo="/" />
        </div>
        <div className="legal-content">
          <h1>Shipping Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 25 September 2026</p>

          <p>This Shipping Policy explains how dispatch and delivery work on Loadify Market, operated by XDrive Logistics Ltd (Company No: 13171804).</p>
          <p><strong>Loadify does not operate a physical warehouse or delivery fleet for marketplace goods.</strong> Marketplace Seller orders are dispatched by the named independent seller. Approved Supplier Marketplace orders are held and dispatched by the independent supplier or its authorised fulfilment provider.</p>

          <h2>1. Shipping Models</h2>
          <p><strong>Marketplace Seller.</strong> The independent seller chooses and manages the available shipping methods, dispatch process and tracking for its products, subject to the terms shown before purchase and applicable Platform rules.</p>
          <p><strong>Approved Supplier Marketplace.</strong> The independent supplier remains the seller of record and controls the stock. The supplier or its authorised fulfilment provider performs physical dispatch. Supplier-held stock does not become Loadify inventory.</p>

          <h2>2. Delivery Areas</h2>
          <p>The delivery territory for a product is shown by the applicable listing and checkout flow. Approved supplier products are only offered where the independent supplier route, stock, pricing and delivery capability are eligible for the buyer's destination.</p>

          <h2>3. Shipping Costs</h2>
          <p>Shipping charges are calculated from the applicable seller or supplier-fulfilment route and are shown before the buyer confirms payment. Relevant factors may include:</p>
          <ul>
            <li>Item weight and dimensions</li>
            <li>Delivery destination</li>
            <li>Selected delivery service</li>
            <li>Whether the order requires parcel, freight or oversized-item handling</li>
          </ul>
          <p>The buyer is not committed to a shipping charge that was not included in the order total shown before payment.</p>

          <h2>4. Dispatch and Estimated Delivery</h2>
          <p>Dispatch and delivery estimates are product- and route-specific. The estimate shown on the product, checkout or order record is the relevant estimate for that purchase. Platform-wide examples or marketing statements do not replace the order-specific delivery information.</p>
          <p>Delivery may be affected by stock changes, carrier operations, address issues, severe weather, public holidays or other events outside the reasonable control of the dispatching party.</p>

          <h2>5. Large Item &amp; Freight Deliveries</h2>
          <p>Where a large-item or freight service is offered, the listing or checkout should identify any important delivery conditions. Depending on the product and carrier:</p>
          <ul>
            <li>Delivery may be kerbside unless another service is expressly stated</li>
            <li>The buyer may need suitable means to receive or unload the goods</li>
            <li>Booked delivery windows or additional handling services may carry separate charges shown before payment</li>
          </ul>

          <h2>6. Order Tracking</h2>
          <p>Where tracking is available, it is attached to the Loadify order record. For Marketplace Seller orders the tracking originates from the seller's fulfilment process. For Approved Supplier Marketplace orders it originates from the independent supplier or its carrier and may be surfaced through Loadify where supported.</p>

          <h2>7. Delivery Issues</h2>
          <p>Examples include non-delivery, significant delay, damage in transit or receipt of an incorrect item.</p>
          <p>For a Marketplace Seller or Approved Supplier Marketplace order, use the responsible seller/supplier contact or order-support route. Loadify may coordinate platform evidence with the seller, supplier or carrier where required.</p>

          <h2>8. Failed Delivery and Address Accuracy</h2>
          <p>Buyers are responsible for providing an accurate delivery address and reasonable delivery-contact information. Additional charges caused by an incorrect address, repeated failed delivery or refused delivery may be recoverable where permitted by law and disclosed terms.</p>

          <h2>9. Contact</h2>
          <p>For shipping-related support:</p>
          <ul>
            <li>Email: contact@loadifymarket.co.uk</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
    </MainLayout>
  );
};

export default ShippingPolicy;