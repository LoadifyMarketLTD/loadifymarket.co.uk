import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Terms & Conditions" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Terms &amp; Conditions</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>These Terms and Conditions ("Terms") govern your use of the Loadify Market website and marketplace platform ("Platform") operated by XDrive Logistics Ltd ("we", "us", "our"), a company registered in England and Wales (Company No: 13171804, VAT: GB375949535), with its registered office at 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom.</p>

          <p>By accessing or using our Platform, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.</p>

          <h2>1. About Our Platform</h2>
          <p>Loadify Market is an online marketplace that connects independent buyers and sellers of wholesale, clearance, overstock and liquidation goods. We do not own, manufacture or sell any products listed on the Platform. Sellers are solely responsible for their listings, product descriptions, pricing and fulfilment.</p>

          <h2>2. Account Registration</h2>
          <p>To use certain features of the Platform, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete information during registration</li>
            <li>Keep your account credentials secure and confidential</li>
            <li>Notify us immediately of any unauthorised access</li>
            <li>Be responsible for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or that are created with false information.</p>

          <h2>3. Seller Obligations</h2>
          <p>If you register as a seller, you agree to:</p>
          <ul>
            <li>List only products you legally own or are authorised to sell</li>
            <li>Provide accurate descriptions, images and pricing</li>
            <li>Fulfil orders promptly and in accordance with your stated terms</li>
            <li>Comply with all applicable UK laws, including consumer protection regulations</li>
            <li>Respond to buyer enquiries in a timely manner</li>
          </ul>

          <h2>4. Buyer Obligations</h2>
          <p>If you register as a buyer, you agree to:</p>
          <ul>
            <li>Pay for items purchased through the Platform</li>
            <li>Provide accurate delivery information</li>
            <li>Inspect goods upon delivery and raise any issues promptly</li>
            <li>Not engage in fraudulent transactions</li>
          </ul>

          <h2>5. Payments</h2>
          <p>All payments on the Platform are processed securely via Stripe. We do not store your card details. Payment terms, including any fees applicable to sellers, are disclosed during the listing process and in the Seller Dashboard.</p>

          <h2>6. Returns &amp; Disputes</h2>
          <p>Return policies are set by individual sellers. If you have a dispute with a seller, we encourage you to resolve it directly. We may assist in mediation at our discretion. Loadify Market is not liable for the quality, legality, or accuracy of any products listed by sellers.</p>

          <h2>7. Intellectual Property</h2>
          <p>All content on the Platform (excluding user-generated content) is owned by XDrive Logistics Ltd. You may not copy, reproduce, distribute or create derivative works from our content without prior written consent.</p>

          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Loadify Market and XDrive Logistics Ltd shall not be liable for any indirect, incidental or consequential damages arising from your use of the Platform. Our total liability shall not exceed the fees paid by you to us in the 12 months preceding the claim.</p>

          <h2>9. Governing Law</h2>
          <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

          <h2>10. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. We will notify registered users of material changes via email or Platform notification. Continued use after changes constitutes acceptance of the updated Terms.</p>

          <h2>11. Contact</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
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

export default TermsAndConditions;
