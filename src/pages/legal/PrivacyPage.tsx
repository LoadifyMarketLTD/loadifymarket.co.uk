export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <div className="card prose max-w-none">
        <p className="text-sm text-gray-600 mb-4">Last updated: December 2025</p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Introduction</h2>
        <p>
          Danny Courier LTD ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy 
          explains how we collect, use, and protect your personal information when you use Loadify Market.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Account Information:</strong> Name, email address, phone number</li>
          <li><strong>Business Information:</strong> Business name, VAT number (for sellers)</li>
          <li><strong>Transaction Information:</strong> Order history, payment details</li>
          <li><strong>Technical Information:</strong> IP address, browser type, device information</li>
          <li><strong>Communication:</strong> Messages sent through our platform</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Process transactions and payments</li>
          <li>Provide customer support</li>
          <li>Send order confirmations and updates</li>
          <li>Prevent fraud and ensure platform security</li>
          <li>Improve our services</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Data Sharing</h2>
        <p>We share your information with:</p>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Other Users:</strong> Buyers and sellers share necessary information to complete transactions</li>
          <li><strong>Payment Processors:</strong> Stripe processes payments securely</li>
          <li><strong>Email Service:</strong> SendGrid sends transactional emails</li>
          <li><strong>Legal Authorities:</strong> When required by law</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Your Rights (GDPR)</h2>
        <p>Under GDPR, you have the right to:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data</li>
          <li>Withdraw consent</li>
          <li>Object to processing</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Data Retention</h2>
        <p>
          We retain your information for as long as necessary to provide our services and comply with 
          legal obligations. You can request account deletion at any time.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal data 
          against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Cookies</h2>
        <p>
          We use cookies to improve your experience. See our Cookie Policy for more details.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Contact</h2>
        <p>
          For privacy-related questions or to exercise your rights, contact us at loadifymarket.co.uk@gmail.com.
        </p>
      </div>
    </div>
  );
}
