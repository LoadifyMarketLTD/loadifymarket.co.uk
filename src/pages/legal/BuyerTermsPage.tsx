export default function BuyerTermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Buyer Terms</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: March 2026</p>

        {/* Intermediary notice banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-1">Important: Marketplace Intermediary</p>
          <p className="text-sm text-blue-700">
            When you buy on Loadify Market, you are purchasing directly from the seller — not from
            Loadify Market or XDrive Logistics Ltd. Loadify Market acts only as the marketplace platform
            that connects you with sellers.
          </p>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Who You Are Buying From</h2>
        <p>
          Loadify Market is a marketplace platform operated by XDrive Logistics Ltd. When you place
          an order on Loadify Market, you are entering into a direct contract of sale with the
          individual seller who listed the product — not with Loadify Market or XDrive Logistics Ltd.
        </p>
        <p className="mt-3">
          Each product listing on the Platform is offered by an independent seller. The seller's name
          and store information are displayed on product pages and in your order details.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Product Responsibility</h2>
        <p>
          All responsibility for the products you purchase rests with the seller. Specifically:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Product accuracy, descriptions, and images are the seller's responsibility.</li>
          <li>Product safety and legal compliance are the seller's responsibility.</li>
          <li>Product availability and stock are managed by the seller.</li>
          <li>Loadify Market does not inspect, verify, or guarantee any product listed on the Platform.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Delivery &amp; Shipping</h2>
        <p>
          Delivery of your order is the sole responsibility of the seller. Loadify Market does not
          handle, dispatch, or deliver any goods. Shipping timescales, methods, and costs are set by
          the seller and displayed at checkout. For delivery queries, please contact the seller
          directly through the Platform's messaging system or raise a dispute if needed.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Returns &amp; Refunds</h2>
        <p>
          You have the right to return eligible products within 14 calendar days of delivery under
          the seller's return policy and applicable consumer law (Consumer Rights Act 2015). Returns
          and refunds are handled by the seller, not by Loadify Market.
        </p>
        <p className="mt-3">
          If a seller fails to process a valid return or refund, you may escalate to Loadify Market
          through the Dispute Centre. Loadify Market will act as a neutral intermediary to assist in
          reaching a resolution.
        </p>
        <p className="mt-3">
          See our <a href="/returns-policy">Returns Policy</a> for full details.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Payments</h2>
        <p>
          Payments are processed securely through Stripe. Your payment is collected by the Platform
          on behalf of the seller. Funds are held and then disbursed to the seller after order
          confirmation, less the Platform commission. Loadify Market does not retain payment as a
          merchant — it acts only as a payment facilitator.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Buyer Protection &amp; Disputes</h2>
        <p>
          Loadify Market offers a Buyer Protection programme. If your order does not arrive, arrives
          damaged, or significantly does not match the description, you may open a dispute through
          your Orders page.
        </p>
        <p className="mt-3">
          In disputes, Loadify Market acts as a neutral intermediary. We are not the contracting
          party and do not carry direct liability for the product, but we will work in good faith to
          assist buyers and sellers in reaching a fair resolution.
        </p>
        <p className="mt-3">
          See our <a href="/buyer-protection">Buyer Protection</a> page for more information.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Invoices</h2>
        <p>
          Invoices for your orders are issued by the seller — not by Loadify Market or XDrive
          Logistics Ltd. Your invoice will display the seller's business name and, where available,
          their VAT number and address. Loadify Market's name will appear only as the marketplace
          facilitator.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Contact &amp; Support</h2>
        <p>
          For order and product queries, contact the seller first through the Platform's messaging
          system. If you are unable to resolve an issue with the seller, you may contact Loadify
          Market Platform Support at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com">loadifymarket.co.uk@gmail.com</a> or
          open a dispute in your Orders page.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Changes to Buyer Terms</h2>
        <p>
          XDrive Logistics Ltd (operating as Loadify Market) reserves the right to update these
          Buyer Terms at any time. Continued use of the Platform constitutes acceptance of the
          updated terms.
        </p>
      </div>
    </div>
  );
}
