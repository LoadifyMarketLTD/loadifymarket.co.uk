import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const ReturnsPolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Returns Policy" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Returns Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>This Returns Policy outlines the terms under which returns and refunds are handled on Loadify Market, operated by XDrive Logistics Ltd (Company No: 13171804).</p>

          <h2>1. Marketplace Returns</h2>
          <p>Loadify Market is an online marketplace. Individual sellers set their own return policies. Before purchasing, please review the seller's specific return terms displayed on each product listing.</p>

          <h2>2. Consumer Rights</h2>
          <p>Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, if you are purchasing as a consumer from a business seller, you have the right to cancel your order within <strong>14 days</strong> of receiving the goods without giving any reason.</p>
          <p>To exercise this right, you must inform the seller of your decision to cancel by a clear statement (e.g. via the Platform messaging system or email).</p>

          <h2>3. Return Conditions</h2>
          <p>For a return to be accepted under the statutory cancellation right:</p>
          <ul>
            <li>Items must be returned within 14 days of notifying the seller of cancellation</li>
            <li>Items must be in their original condition, unused and in original packaging where possible</li>
            <li>The buyer is responsible for the cost of returning the goods unless the seller agrees otherwise</li>
          </ul>

          <h2>4. Exceptions</h2>
          <p>The statutory cancellation right does not apply to:</p>
          <ul>
            <li>Goods that are clearly personalised or made to order</li>
            <li>Sealed goods that are not suitable for return due to health or hygiene reasons, once unsealed</li>
            <li>Goods that deteriorate or expire rapidly</li>
            <li>Business-to-business (B2B) transactions where the buyer is not acting as a consumer</li>
          </ul>

          <h2>5. Faulty or Misdescribed Goods</h2>
          <p>Under the Consumer Rights Act 2015, goods must be as described, of satisfactory quality and fit for purpose. If goods are faulty or significantly not as described, you are entitled to:</p>
          <ul>
            <li><strong>Within 30 days:</strong> A full refund</li>
            <li><strong>Within 6 months:</strong> A repair or replacement; if that fails, a refund</li>
            <li><strong>After 6 months:</strong> A repair or replacement; the burden of proof shifts to the buyer</li>
          </ul>

          <h2>6. Refund Process</h2>
          <p>Refunds are processed by the seller through the original payment method. Timelines vary by seller but typically take 5–14 business days after the returned item is received and inspected.</p>

          <h2>7. Disputes</h2>
          <p>If you are unable to resolve a return or refund issue directly with a seller, you may contact Loadify Market support. We will review the case and may mediate at our discretion. Our decision is final in cases where we facilitate dispute resolution.</p>

          <h2>8. Wholesale &amp; Bulk Orders</h2>
          <p>Pallet and bulk orders may be subject to different return terms as agreed between buyer and seller. These transactions are often B2B and may not carry the same statutory consumer rights. Please confirm return terms before placing large orders.</p>

          <h2>9. Contact</h2>
          <p>For returns-related queries, please contact the seller directly. For Platform support:</p>
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

export default ReturnsPolicy;
