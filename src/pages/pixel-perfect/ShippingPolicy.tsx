import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Shipping Policy" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Shipping Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>This Shipping Policy outlines how shipping and delivery work on Loadify Market, operated by XDrive Logistics Ltd (Company No: 13171804).</p>

          <h2>1. Marketplace Shipping Model</h2>
          <p>Loadify Market is a marketplace connecting independent buyers and sellers. Each seller is responsible for shipping their own products. Shipping methods, costs, timelines and carrier choices are set by individual sellers and displayed on each product listing.</p>

          <h2>2. Delivery Areas</h2>
          <p>Most sellers on Loadify Market ship within the United Kingdom. Some sellers may offer international shipping. Delivery areas are specified on each product listing. Please check the seller's shipping details before placing an order.</p>

          <h2>3. Shipping Costs</h2>
          <p>Shipping costs are determined by the seller based on:</p>
          <ul>
            <li>Item weight and dimensions</li>
            <li>Delivery destination</li>
            <li>Shipping method selected</li>
            <li>Whether the order is a pallet/bulk shipment</li>
          </ul>
          <p>Shipping costs are displayed at checkout before you confirm your order.</p>

          <h2>4. Estimated Delivery Times</h2>
          <p>Delivery timeframes vary by seller and shipping method. Typical estimates for UK delivery:</p>
          <ul>
            <li><strong>Standard delivery:</strong> 3–7 business days</li>
            <li><strong>Express delivery:</strong> 1–3 business days</li>
            <li><strong>Pallet delivery:</strong> 5–10 business days (dependent on carrier and location)</li>
            <li><strong>Collection:</strong> Available from some sellers — arranged directly</li>
          </ul>
          <p>These are estimates only. Actual delivery times may vary due to stock availability, carrier schedules and external factors.</p>

          <h2>5. Pallet &amp; Freight Deliveries</h2>
          <p>For pallet and large freight orders:</p>
          <ul>
            <li>Delivery is typically kerbside unless otherwise agreed</li>
            <li>The buyer is responsible for having adequate means to receive and unload pallets</li>
            <li>Specific delivery arrangements should be confirmed with the seller before purchase</li>
            <li>Additional charges may apply for tail-lift delivery or specific time slots</li>
          </ul>

          <h2>6. Order Tracking</h2>
          <p>Where available, sellers will provide tracking information via the Platform. You can view tracking updates in your Buyer Dashboard under "Orders". Not all sellers or shipping methods include tracking.</p>

          <h2>7. Delivery Issues</h2>
          <p>If you experience delivery issues such as:</p>
          <ul>
            <li>Non-delivery or significant delays</li>
            <li>Damaged goods on arrival</li>
            <li>Incorrect items received</li>
          </ul>
          <p>Please contact the seller directly through the Platform. If the issue remains unresolved, contact Loadify Market support for assistance.</p>

          <h2>8. Contact</h2>
          <p>For shipping-related queries:</p>
          <ul>
            <li>Email: loadifymarket.co.uk@gmail.com</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShippingPolicy;
