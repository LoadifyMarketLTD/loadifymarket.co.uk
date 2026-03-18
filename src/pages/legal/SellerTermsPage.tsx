export default function SellerTermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Seller Terms</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: March 2026</p>

        {/* Intermediary notice banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-1">Marketplace Platform Terms for Sellers</p>
          <p className="text-sm text-green-700">
            By listing products on Loadify Market, you confirm that you are the legal seller of
            the goods and that you accept full responsibility for your listings, sales, and
            fulfilment. Loadify Market (operated by XDrive Logistics Ltd) provides only the
            marketplace platform.
          </p>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Platform Model</h2>
        <p>
          Loadify Market is a marketplace intermediary operated by XDrive Logistics Ltd. By listing
          products on the Platform, you ("the Seller") confirm that:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>You are the legal owner and seller of the goods you list.</li>
          <li>You are not acting on behalf of Loadify Market or XDrive Logistics Ltd.</li>
          <li>Loadify Market is not your agent, employer, or co-seller.</li>
          <li>The contract of sale for each product is between you and the buyer — not between the
            buyer and Loadify Market.</li>
          <li>Loadify Market is not the merchant of record for your sales.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Seller Responsibilities</h2>
        <p>
          As a seller on Loadify Market, you are solely responsible for:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Product accuracy:</strong> All descriptions, titles, images, specifications, and
            conditions must be accurate and not misleading.</li>
          <li><strong>Pricing:</strong> You set your own prices. Loadify Market does not control or
            recommend prices.</li>
          <li><strong>Legality:</strong> All listed products must comply with all applicable UK laws
            and regulations. You must not list counterfeit, prohibited, or restricted goods.</li>
          <li><strong>VAT &amp; tax obligations:</strong> You are solely responsible for determining,
            collecting, declaring, and remitting VAT and any other taxes applicable to your sales.
            Loadify Market does not collect VAT on your behalf.</li>
          <li><strong>Stock management:</strong> You are responsible for maintaining accurate stock
            levels and removing listings for unavailable products.</li>
          <li><strong>Fulfilment &amp; delivery:</strong> You are responsible for packaging, dispatching,
            and delivering orders to buyers within the timescales stated in your listings.</li>
          <li><strong>Returns &amp; refunds:</strong> You must maintain a fair returns policy consistent
            with the Consumer Rights Act 2015 and Loadify Market's Returns Policy. You are responsible
            for processing all returns and refunds.</li>
          <li><strong>Customer service:</strong> You are responsible for all communications with buyers
            regarding your products, orders, and fulfilment.</li>
          <li><strong>Compliance:</strong> You are responsible for your compliance with all applicable
            trading standards, consumer protection, data protection, and other legal requirements.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Platform Commission</h2>
        <p>
          During the current introductory period, Loadify Market charges <strong>0% commission</strong> on
          completed transactions. The Platform reserves the right to introduce service fees or
          commission in the future, and sellers will be given advance notice of any such changes.
        </p>
        <p className="mt-3">
          Any future commission or fee structure will be Loadify Market's fee for platform services
          only. It does not confer any responsibility on Loadify Market for your products, sales,
          or customer obligations.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Stripe Connect &amp; Payouts</h2>
        <p>
          To receive payouts from sales, sellers must connect a Stripe account via the Platform's
          Stripe Connect integration. Payouts are processed after order completion, minus the platform
          commission. You agree to Stripe's Terms of Service in addition to these Seller Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Invoices &amp; VAT</h2>
        <p>
          Customer invoices for your sales are issued in your name (using your business name, address,
          and VAT number where provided). Loadify Market's name appears only as the marketplace
          facilitator on invoices — not as the seller. You are responsible for ensuring your VAT
          number is correctly registered in your seller profile if you are VAT-registered.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Disputes &amp; Buyer Protection</h2>
        <p>
          Buyers may open disputes against your orders through the Platform's Dispute Centre. You are
          required to respond to disputes in good faith and within a reasonable time. Loadify Market
          acts as a neutral intermediary in disputes and may make a final determination where the
          parties cannot agree. Non-engagement in disputes may result in automatic refunds being
          issued or account suspension.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Platform Rules &amp; Prohibited Listings</h2>
        <p>Sellers must not:</p>
        <ul className="list-disc pl-6 my-4">
          <li>List counterfeit, fake, or IP-infringing products</li>
          <li>List prohibited, illegal, or age-restricted goods without appropriate compliance</li>
          <li>Manipulate reviews, ratings, or feedback</li>
          <li>Circumvent platform fees or process transactions off-platform</li>
          <li>Misrepresent their identity, location, or business type</li>
          <li>Engage in any deceptive or fraudulent trading practices</li>
        </ul>
        <p>
          See our <a href="/acceptable-use-policy">Acceptable Use Policy</a> and{' '}
          <a href="/seller-guidelines">Seller Guidelines</a> for more detail.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Account Suspension &amp; Termination</h2>
        <p>
          Loadify Market reserves the right to suspend or terminate seller accounts for breach of
          these Seller Terms, violation of the Acceptable Use Policy, or actions that harm buyers
          or the integrity of the Platform.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Limitation of Platform Liability</h2>
        <p>
          Loadify Market (XDrive Logistics Ltd) provides the Platform on an "as-is" basis. We do not
          guarantee continuous availability, a minimum number of orders, or any specific level of
          sales. We are not liable for any losses arising from your use of the Platform or from
          transactions between you and buyers.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">10. Changes to Seller Terms</h2>
        <p>
          XDrive Logistics Ltd (operating as Loadify Market) reserves the right to update these
          Seller Terms at any time. We will notify sellers of material changes. Continued use of
          the Platform after changes constitutes acceptance of the updated terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">11. Contact</h2>
        <p>
          For questions about these Seller Terms, please contact XDrive Logistics Ltd (operating as
          Loadify Market) at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com">loadifymarket.co.uk@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
