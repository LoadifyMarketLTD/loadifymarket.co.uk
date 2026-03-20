import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Privacy Policy" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>This Privacy Policy explains how XDrive Logistics Ltd ("we", "us", "our"), trading as Loadify Market, collects, uses and protects your personal data when you use our website and marketplace platform. We are committed to protecting your privacy in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

          <h2>1. Data Controller</h2>
          <p>The data controller is XDrive Logistics Ltd, registered in England and Wales (Company No: 13171804), with its registered office at 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom.</p>
          <p>Email: loadifymarket.co.uk@gmail.com</p>

          <h2>2. Information We Collect</h2>
          <p>We may collect the following personal data:</p>
          <ul>
            <li><strong>Account information:</strong> Name, email address, phone number, business name, address</li>
            <li><strong>Transaction data:</strong> Purchase history, payment information (processed by Stripe — we do not store card details)</li>
            <li><strong>Technical data:</strong> IP address, browser type, device information, pages visited</li>
            <li><strong>Communications:</strong> Messages sent through our platform, support enquiries</li>
            <li><strong>Cookie data:</strong> As described in our Cookie Policy</li>
          </ul>

          <h2>3. How We Use Your Data</h2>
          <p>We use your personal data for the following purposes:</p>
          <ul>
            <li>To provide and maintain our marketplace platform</li>
            <li>To process transactions and payments</li>
            <li>To verify seller accounts and maintain platform trust</li>
            <li>To communicate with you about your account, orders and enquiries</li>
            <li>To improve our platform and user experience</li>
            <li>To comply with legal obligations</li>
            <li>To prevent fraud and ensure platform security</li>
          </ul>

          <h2>4. Legal Basis for Processing</h2>
          <p>We process your personal data under the following legal bases:</p>
          <ul>
            <li><strong>Contract:</strong> To fulfil our obligations when you use our platform</li>
            <li><strong>Legitimate interest:</strong> To improve our services, prevent fraud and ensure security</li>
            <li><strong>Consent:</strong> For marketing communications and non-essential cookies</li>
            <li><strong>Legal obligation:</strong> To comply with UK law and regulations</li>
          </ul>

          <h2>5. Data Sharing</h2>
          <p>We may share your data with:</p>
          <ul>
            <li><strong>Stripe:</strong> For payment processing</li>
            <li><strong>Buyers/Sellers:</strong> Necessary transaction details to complete orders</li>
            <li><strong>Service providers:</strong> Hosting, email and analytics services that support our platform</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>

          <h2>6. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active or as needed to provide our services. After account closure, we retain data for up to 6 years to comply with legal and regulatory requirements. You may request earlier deletion subject to our legal obligations.</p>

          <h2>7. Your Rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> your personal data</li>
            <li><strong>Rectify</strong> inaccurate or incomplete data</li>
            <li><strong>Erase</strong> your data (right to be forgotten)</li>
            <li><strong>Restrict</strong> processing of your data</li>
            <li><strong>Object</strong> to processing based on legitimate interest</li>
            <li><strong>Data portability</strong> — receive your data in a structured format</li>
            <li><strong>Withdraw consent</strong> at any time for consent-based processing</li>
          </ul>
          <p>To exercise any of these rights, please contact us at loadifymarket.co.uk@gmail.com. We will respond within 30 days.</p>

          <h2>8. Cookies</h2>
          <p>We use cookies to improve your experience. Essential cookies are always active. Non-essential cookies (analytics, marketing) are only activated with your consent. You can manage your preferences via the cookie banner on our website.</p>

          <h2>9. Data Security</h2>
          <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure or destruction. All payment data is processed securely by Stripe and we do not store card details on our servers.</p>

          <h2>10. International Transfers</h2>
          <p>Your data is primarily processed within the UK and EEA. Where data is transferred outside these areas (e.g., to service providers), we ensure appropriate safeguards are in place, such as Standard Contractual Clauses.</p>

          <h2>11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice on our website. The "Last updated" date at the top of this page indicates when this policy was last revised.</p>

          <h2>12. Complaints</h2>
          <p>If you are not satisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary">ico.org.uk</a>.</p>

          <h2>13. Contact</h2>
          <p>For any privacy-related questions or requests, please contact us at:</p>
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

export default PrivacyPolicy;
