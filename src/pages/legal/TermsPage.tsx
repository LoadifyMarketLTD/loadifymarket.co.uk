export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Terms &amp; Conditions</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: March 2026</p>

        {/* Intermediary notice banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">Marketplace Intermediary Notice</p>
          <p className="text-sm text-amber-700">
            Loadify Market is a marketplace platform operated by XDrive Logistics Ltd. We do not sell,
            purchase, or own any of the products listed on this platform. All transactions are made
            directly between buyers and sellers. Loadify Market is not the merchant of record.
          </p>
        </div>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Introduction</h2>
        <p>
          Welcome to Loadify Market ("the Platform"), an online marketplace platform operated by
          XDrive Logistics Ltd ("we", "our", "us", "the Company"). These Terms and Conditions govern
          your use of the Platform located at loadifymarket.co.uk. By accessing or using the Platform,
          you agree to be bound by these Terms.
        </p>
        <p className="mt-3">
          Loadify Market acts solely as an intermediary marketplace. We do not sell products, purchase
          goods, act as merchant of record, or hold stock. All sales contracts are formed directly
          between the buyer and the seller.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Company Information</h2>
        <p>
          The Loadify Market platform is operated by XDrive Logistics Ltd, a company registered in
          England and Wales.
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Legal Entity: XDrive Logistics Ltd</li>
          <li>Platform Name: Loadify Market</li>
          <li>Company Number: 13171804</li>
          <li>Registered in England and Wales</li>
          <li>Address: 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</li>
          <li>VAT Number: GB375949535</li>
          <li>Email: loadifymarket.co.uk@gmail.com</li>
        </ul>
        <p>
          The VAT number above belongs to XDrive Logistics Ltd as the platform operator. It is not
          the seller VAT number for any individual product transaction. Sellers are solely responsible
          for their own VAT and tax obligations.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. The Marketplace Model — Intermediary Only</h2>
        <p>
          Loadify Market is a marketplace intermediary. This means:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Buyers</strong> purchase directly from individual sellers listed on the Platform.</li>
          <li><strong>Sellers</strong> list and sell their own products to buyers through the Platform.</li>
          <li><strong>Loadify Market</strong> (XDrive Logistics Ltd) provides the platform, facilitates
            the connection between buyers and sellers, and charges a service fee / commission.</li>
          <li>Loadify Market is <strong>not</strong> the seller of any listed product.</li>
          <li>Loadify Market is <strong>not</strong> the buyer of any listed product.</li>
          <li>Loadify Market is <strong>not</strong> the merchant of record for any transaction.</li>
        </ul>
        <p>
          The contract of sale is formed directly between the buyer and the seller. Any legal or
          commercial responsibility for the products listed — including product accuracy, legality,
          fulfilment, VAT/tax obligations, delivery, returns, and refunds — belongs solely to the
          seller, not to Loadify Market or XDrive Logistics Ltd.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. User Accounts</h2>
        <p>
          To use certain features of the Platform, you must create an account. You are responsible for
          maintaining the confidentiality of your account credentials and for all activities that occur
          under your account.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Platform Commission &amp; Service Fee</h2>
        <p>
          Loadify Market charges a commission of 7% on all transactions completed through the Platform.
          This commission is deducted from the seller's payout as a fee for providing the marketplace
          platform services. The commission is not a charge to buyers and does not affect the buyer's
          purchase price.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5a. Payment Processing — Stripe</h2>
        <p>
          All payments made through the Loadify Market platform are processed securely by{' '}
          <strong>Stripe</strong> (Stripe, Inc. / Stripe Payments Europe, Ltd.), a third-party payment
          service provider. Loadify Market does not store or handle payment card data directly.
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Buyers pay via Stripe's secure checkout. Card details are handled solely by Stripe.</li>
          <li>Sellers receive payouts via <strong>Stripe Connect</strong>, Stripe's marketplace payout product.</li>
          <li>Loadify Market (XDrive Logistics Ltd) is the platform operator, not the merchant of record.</li>
          <li>Stripe's own Terms of Service and Privacy Policy apply to all payment processing.</li>
          <li>Funds may be held in escrow via Stripe pending order confirmation.</li>
        </ul>
        <p>
          By using the Platform, buyers and sellers agree to Stripe's Terms of Service, available at{' '}
          <a href="https://stripe.com/gb/legal" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">
            stripe.com/gb/legal
          </a>.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. VAT and Pricing</h2>
        <p>
          Prices displayed on the Platform are set by individual sellers. All prices should include VAT
          at the applicable rate unless otherwise stated. Each seller is solely responsible for
          calculating, collecting, reporting, and remitting VAT or other taxes applicable to their sales.
          Loadify Market does not collect or remit VAT on behalf of sellers.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Buyer Terms</h2>
        <p>
          When purchasing through Loadify Market, buyers acknowledge and agree that:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>You are purchasing directly from the seller, not from Loadify Market.</li>
          <li>Product descriptions, pricing, and availability are the sole responsibility of the seller.</li>
          <li>Delivery, fulfilment, and shipping are the sole responsibility of the seller.</li>
          <li>Returns and refunds are governed by the seller's own returns policy, subject to applicable
            consumer law and Loadify Market's Returns Policy.</li>
          <li>Loadify Market may assist as a neutral intermediary in the event of a dispute between
            buyer and seller, but is not the contracting seller and bears no direct liability for the
            product or the transaction.</li>
          <li>Buyers have 14 calendar days from delivery to request a return. See our
            {' '}<a href="/returns-policy">Returns Policy</a> for full details.</li>
        </ul>
        <p>
          For a full statement of your rights as a buyer on this platform, please see our{' '}
          <a href="/buyer-terms">Buyer Terms</a>.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Seller Terms</h2>
        <p>
          By listing products on Loadify Market, sellers acknowledge and agree that:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>You are the legal seller of the goods you list and are solely responsible for their
            legality, accuracy, safety, and compliance with all applicable laws and regulations.</li>
          <li>You are responsible for your own VAT and tax obligations on all sales made through the
            Platform.</li>
          <li>You are responsible for all aspects of fulfilment, including packaging, shipping,
            delivery times, and returns handling.</li>
          <li>You accept that Loadify Market will deduct a 7% commission from your payout as a
            platform service fee.</li>
          <li>Loadify Market provides only the platform infrastructure. It does not act as your agent,
            employer, or merchant of record.</li>
        </ul>
        <p>
          For a full statement of your obligations as a seller on this platform, please see our{' '}
          <a href="/seller-terms">Seller Terms</a>.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Disputes</h2>
        <p>
          The Platform's Dispute Centre allows buyers and sellers to resolve issues. Loadify Market
          acts only as a neutral intermediary in disputes — not as the contracting seller. All parties
          agree to participate in good faith dispute resolution. Loadify Market reserves the right to
          make a final determination in unresolved disputes, which may include issuing refunds or
          suspending accounts.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">10. Prohibited Activities</h2>
        <p>Users must not:</p>
        <ul className="list-disc pl-6 my-4">
          <li>List counterfeit, illegal, or restricted items</li>
          <li>Engage in fraudulent activities</li>
          <li>Manipulate reviews or ratings</li>
          <li>Circumvent platform fees or payment processes</li>
          <li>Transact off-platform to avoid commission</li>
          <li>Misrepresent products, prices, or seller identity</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">11. Limitation of Liability</h2>
        <p>
          Loadify Market (operated by XDrive Logistics Ltd) provides the Platform as an intermediary
          only. To the maximum extent permitted by law, XDrive Logistics Ltd shall not be liable for:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>The quality, safety, legality, or accuracy of any product listed on the Platform</li>
          <li>The ability of sellers to complete transactions or fulfil orders</li>
          <li>The ability of buyers to pay for orders</li>
          <li>Any loss arising from transactions between buyers and sellers</li>
          <li>Any acts or omissions of sellers or buyers</li>
        </ul>
        <p>
          Nothing in these Terms limits liability for fraud, death, or personal injury caused by
          negligence.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">12. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of material
          changes. Continued use of the Platform after changes constitutes acceptance of the updated Terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of England and Wales. Any disputes arising from these
          Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">14. Contact</h2>
        <p>
          For questions about these Terms, please contact XDrive Logistics Ltd (operating as Loadify Market)
          at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com">loadifymarket.co.uk@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
