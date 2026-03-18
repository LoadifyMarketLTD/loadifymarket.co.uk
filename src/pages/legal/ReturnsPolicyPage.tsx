export default function ReturnsPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Returns &amp; Refunds Policy</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: March 2026</p>

        {/* Platform notice banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">Marketplace Policy Notice</p>
          <p className="text-sm text-amber-700">
            Loadify Market is a marketplace platform only. We do not handle, manage, or process
            returns or refunds directly. All return and refund requests must be handled directly
            between the buyer and the seller.
          </p>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Platform Role in Returns</h2>
        <p>
          Loadify Market acts solely as an intermediary marketplace. We do <strong>not</strong>:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Handle or process return requests on behalf of sellers</li>
          <li>Issue refunds directly to buyers</li>
          <li>Hold or manage funds for return transactions</li>
          <li>Accept returned items on behalf of sellers</li>
        </ul>
        <p>
          All return and refund disputes must be resolved <strong>directly between the buyer and
          the seller</strong>.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Seller Responsibility</h2>
        <p>
          Each seller is individually and fully responsible for their own returns and refunds policy.
          Sellers must clearly state their returns policy in their product listings. Sellers are
          required to comply with all applicable UK consumer protection law, including the Consumer
          Rights Act 2015 and the Consumer Contracts Regulations 2013.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. How to Request a Return</h2>
        <p>
          If you wish to return an item, you must contact the seller directly. To do so:
        </p>
        <ol className="list-decimal pl-6 my-4">
          <li>Go to your Orders page and locate the relevant order</li>
          <li>Use the messaging feature to contact the seller</li>
          <li>Clearly explain the reason for the return request</li>
          <li>Provide supporting evidence (photos, etc.) where applicable</li>
          <li>Agree on return terms and refund process directly with the seller</li>
        </ol>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Dispute Resolution</h2>
        <p>
          If you are unable to reach an agreement with the seller, you may raise a dispute through
          the Loadify Market Dispute Centre. The platform will act as a neutral intermediary to
          assist both parties in reaching a resolution. However, Loadify Market does not guarantee
          any particular outcome and is not the contracting seller.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Payments &amp; Refunds</h2>
        <p>
          All payments are processed by Stripe. Refunds, where agreed between buyer and seller,
          are processed through Stripe's refund mechanism. Loadify Market does not directly issue
          or authorise refunds — this is the sole responsibility of the seller.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Non-Returnable Items</h2>
        <p>
          Certain items may not be eligible for return depending on the seller's policy. Common
          examples include:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Perishable goods</li>
          <li>Custom or personalised items</li>
          <li>Digital products</li>
          <li>Items marked as "final sale" or "no returns"</li>
        </ul>
        <p>
          Always check the seller's individual returns policy before purchasing.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Governing Law</h2>
        <p>
          This policy is governed by the laws of England and Wales.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Contact</h2>
        <p>
          For general platform queries, contact us at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-[#1E3A5F] hover:underline">
            loadifymarket.co.uk@gmail.com
          </a>. For returns and refunds, please contact the seller directly.
        </p>
      </div>
    </div>
  );
}
