import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const Disclaimer = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Disclaimer" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Disclaimer</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>The information provided on the Loadify Market website ("Platform") is for general informational purposes only. By using this Platform, you acknowledge and agree to the following:</p>

          <h2>1. Marketplace Model</h2>
          <p>Loadify Market is an online marketplace operated by XDrive Logistics Ltd (Company No: 13171804, VAT: GB375949535). We act solely as an intermediary connecting independent buyers and sellers. We do not own, manufacture, store, inspect or sell any products listed on the Platform.</p>

          <h2>2. Product Listings</h2>
          <p>All product listings, descriptions, images, prices and claims are provided by individual sellers. We do not verify the accuracy, completeness or reliability of any listing. Buyers should conduct their own due diligence before making a purchase.</p>

          <h2>3. No Guarantee</h2>
          <p>We make no representations or warranties of any kind, express or implied, about:</p>
          <ul>
            <li>The quality, safety or legality of items listed</li>
            <li>The accuracy of product descriptions or images</li>
            <li>The ability of sellers to complete transactions</li>
            <li>The ability of buyers to pay for purchases</li>
            <li>The uninterrupted or error-free operation of the Platform</li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, XDrive Logistics Ltd and its directors, employees and agents shall not be liable for any direct, indirect, incidental, special, consequential or punitive damages arising from:</p>
          <ul>
            <li>Your use of or inability to use the Platform</li>
            <li>Any transaction between buyers and sellers</li>
            <li>Any content posted by users or third parties</li>
            <li>Unauthorised access to your account or data</li>
            <li>Errors, viruses or inaccuracies in Platform content</li>
          </ul>

          <h2>5. Third-Party Links</h2>
          <p>The Platform may contain links to third-party websites or services. We have no control over and assume no responsibility for the content, privacy policies or practices of any third-party sites or services.</p>

          <h2>6. Professional Advice</h2>
          <p>Nothing on this Platform constitutes professional, legal, financial or tax advice. If you require such advice, please consult a qualified professional.</p>

          <h2>7. Changes</h2>
          <p>We reserve the right to modify this Disclaimer at any time. Changes take effect immediately upon posting to the Platform.</p>

          <h2>8. Governing Law</h2>
          <p>This Disclaimer is governed by the laws of England and Wales.</p>

          <h2>9. Contact</h2>
          <p>If you have questions about this Disclaimer, contact us:</p>
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

export default Disclaimer;
