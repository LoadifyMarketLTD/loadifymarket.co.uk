import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const SellerTerms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Seller Terms" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Seller Terms</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>These Seller Terms apply to all users who list and sell goods through Loadify Market ("Platform"), operated by XDrive Logistics Ltd (Company No: 13171804, VAT: GB375949535). These terms supplement our general <a href="/terms">Terms &amp; Conditions</a>.</p>

          <h2>1. Seller Eligibility</h2>
          <p>To sell on Loadify Market, you must:</p>
          <ul>
            <li>Be at least 18 years of age</li>
            <li>Be a registered business or sole trader operating lawfully in the UK</li>
            <li>Complete the seller registration process with accurate business information</li>
            <li>Agree to these Seller Terms and our general Terms &amp; Conditions</li>
          </ul>
          <p>We reserve the right to verify seller information and may request additional documentation.</p>

          <h2>2. Listing Products</h2>
          <p>When listing products on the Platform, you agree to:</p>
          <ul>
            <li>Only list products you legally own or are authorised to sell</li>
            <li>Provide accurate, complete and non-misleading descriptions, images and pricing</li>
            <li>Clearly state product condition (new, refurbished, returns, clearance, etc.)</li>
            <li>Set fair and transparent shipping costs</li>
            <li>Comply with all applicable UK laws including product safety, trading standards and consumer protection regulations</li>
          </ul>

          <h2>3. Prohibited Items</h2>
          <p>You must not list items that are:</p>
          <ul>
            <li>Illegal to sell in the UK</li>
            <li>Counterfeit, stolen or recalled</li>
            <li>Dangerous or restricted without proper licensing</li>
            <li>In violation of intellectual property rights</li>
          </ul>
          <p>We reserve the right to remove listings and suspend accounts that violate these restrictions.</p>

          <h2>4. Fees &amp; Payments</h2>
          <p>Sellers may be subject to:</p>
          <ul>
            <li><strong>Listing fees:</strong> Charges for listing products on the Platform (if applicable)</li>
            <li><strong>Commission:</strong> A percentage of each successful sale</li>
            <li><strong>Payment processing fees:</strong> Charged by our payment provider (Stripe)</li>
          </ul>
          <p>Current fee schedules are available in the Seller Dashboard. We reserve the right to update fees with 30 days' notice.</p>

          <h2>5. Order Fulfilment</h2>
          <p>As a seller, you are responsible for:</p>
          <ul>
            <li>Fulfilling orders promptly within stated timelines</li>
            <li>Packaging items securely and appropriately</li>
            <li>Providing tracking information where available</li>
            <li>Handling returns and refunds in accordance with your stated return policy and UK law</li>
            <li>Responding to buyer enquiries within 48 hours</li>
          </ul>

          <h2>6. Seller Standards</h2>
          <p>We expect all sellers to maintain high standards including:</p>
          <ul>
            <li>Accurate product descriptions and images</li>
            <li>Timely order fulfilment and dispatch</li>
            <li>Professional and courteous communication with buyers</li>
            <li>Fair handling of returns and disputes</li>
          </ul>
          <p>Sellers who consistently fail to meet these standards may face account restrictions or suspension.</p>

          <h2>7. Intellectual Property</h2>
          <p>You retain ownership of your product images and descriptions. By listing on Loadify Market, you grant us a non-exclusive, royalty-free licence to use your listing content for the purpose of operating and promoting the Platform.</p>

          <h2>8. Account Suspension &amp; Termination</h2>
          <p>We may suspend or terminate your seller account if you:</p>
          <ul>
            <li>Violate these Seller Terms or our general Terms &amp; Conditions</li>
            <li>Receive repeated buyer complaints</li>
            <li>List prohibited or illegal items</li>
            <li>Engage in fraudulent or deceptive practices</li>
            <li>Fail to fulfil orders consistently</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p>Loadify Market is not liable for any losses arising from your use of the Platform as a seller, including but not limited to lost sales, delivery issues or buyer disputes. You are solely responsible for your products, listings and transactions.</p>

          <h2>10. Indemnification</h2>
          <p>You agree to indemnify and hold harmless XDrive Logistics Ltd, its directors, employees and agents from any claims, damages or expenses arising from your use of the Platform, your listings, or your breach of these Seller Terms.</p>

          <h2>11. Contact</h2>
          <p>For seller-related queries:</p>
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

export default SellerTerms;
