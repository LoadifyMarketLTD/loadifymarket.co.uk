export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Disclaimer</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: March 2026</p>

        {/* Critical notice banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-red-800 mb-1">Important Notice</p>
          <p className="text-sm text-red-700">
            Loadify Market is a digital marketplace platform only. We do not verify, inspect, or
            guarantee the quality of any products listed on this platform. All transactions are
            strictly between buyers and sellers.
          </p>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Platform Role</h2>
        <p>
          Loadify Market is a technology provider and digital marketplace intermediary. We provide
          the infrastructure that connects buyers and sellers. We are NOT:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>A seller of any products listed on this platform</li>
          <li>A distributor of any goods</li>
          <li>A logistics or delivery company</li>
          <li>A manufacturer or supplier of any listed items</li>
          <li>The merchant of record for any transaction</li>
        </ul>
        <p>
          Loadify Market is <strong>only</strong> a digital marketplace platform that facilitates
          connections between independent buyers and sellers.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. No Product Verification</h2>
        <p>
          Loadify Market does <strong>not</strong>:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Verify the accuracy or completeness of product listings</li>
          <li>Inspect goods before, during, or after listing</li>
          <li>Guarantee the quality, safety, or fitness for purpose of any product</li>
          <li>Authenticate or validate sellers' claims about their products</li>
          <li>Confirm the condition of items at time of sale or delivery</li>
        </ul>
        <p>
          All product information, descriptions, images, and pricing are provided solely by
          individual sellers. Loadify Market accepts no responsibility for inaccurate, misleading,
          or incorrect listings.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Seller Responsibility</h2>
        <p>
          Each seller on Loadify Market is solely and fully responsible for:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>The legality of their products under UK and applicable law</li>
          <li>The accuracy of product descriptions, images, and specifications</li>
          <li>The condition and quality of goods as described</li>
          <li>Fulfilling orders promptly and as advertised</li>
          <li>Handling returns and refunds in accordance with applicable consumer law</li>
          <li>Their own VAT and tax obligations</li>
          <li>Compliance with all relevant regulations</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. No Liability for Transactions</h2>
        <p>
          Loadify Market is <strong>not</strong> liable for:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Product defects, faults, or damage</li>
          <li>Misleading, inaccurate, or false product listings</li>
          <li>Seller behaviour, conduct, or fulfilment failures</li>
          <li>Delivery failures, delays, or damage in transit</li>
          <li>Fraud committed by buyers or sellers</li>
          <li>Disputes arising between buyers and sellers</li>
          <li>Financial loss resulting from transactions on this platform</li>
          <li>Any indirect, special, or consequential loss of any kind</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. No Financial Liability</h2>
        <p>
          Payments on Loadify Market are processed externally by Stripe. Loadify Market does not
          hold, process, or control funds. We are not responsible for payment disputes, chargebacks,
          or financial losses arising from payment processing issues.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. External Links</h2>
        <p>
          This platform may contain links to third-party websites. Loadify Market has no control
          over the content or practices of those sites and accepts no responsibility for them.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. No Warranties</h2>
        <p>
          The platform is provided on an "as is" and "as available" basis. To the fullest extent
          permitted by law, Loadify Market makes no warranties — express or implied — regarding the
          platform's availability, reliability, or suitability for any particular purpose.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Governing Law</h2>
        <p>
          This Disclaimer is governed by the laws of England and Wales.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Contact</h2>
        <p>
          For questions about this Disclaimer, please contact us at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-[#1E3A5F] hover:underline">
            loadifymarket.co.uk@gmail.com
          </a>.
        </p>
      </div>
    </div>
  );
}
