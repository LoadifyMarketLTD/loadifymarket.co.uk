import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const TermsAndConditions = () => {
  return (
    <MainLayout>
      <SEO title="Terms & Conditions | Loadify Market" description="Read the terms that govern marketplace-seller and Loadify Supplier-Fulfilled purchases on Loadify Market." canonical="/terms" />
      <main id="main-content" className="pt-4 md:pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Terms & Conditions" }]} backTo="/" />
        </div>
        <div className="legal-content">
          <h1>Terms &amp; Conditions</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 21 September 2026</p>

          <p>These Terms and Conditions ("Terms") govern your use of the Loadify Market website and marketplace platform ("Platform") operated by XDrive Logistics Ltd ("we", "us", "our"), a company registered in England and Wales (Company No: 13171804, VAT: GB375949535), with its registered office at 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom.</p>
          <p>By accessing or using our Platform, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.</p>

          <h2>1. About Our Platform and Commerce Models</h2>
          <p>Loadify Market is a UK-operated multi-category commerce platform. The Platform supports more than one sales and fulfilment model, and the seller-of-record information shown on the relevant product, checkout and order record determines which model applies.</p>
          <p><strong>Marketplace Seller orders.</strong> Where an independent seller is identified as the seller, the sales contract is between the buyer and that independent seller. The seller is responsible for its listing, product, stock, pricing, legal compliance, fulfilment, delivery, returns and refunds, subject to applicable law and Platform rules. Loadify provides marketplace technology, checkout, order management and dispute-support services.</p>
          <p><strong>Loadify Supplier-Fulfilled orders.</strong> Where Loadify Market is identified as the seller, the sales contract is between the buyer and XDrive Logistics Ltd trading as Loadify Market. Loadify is the seller and merchant of record for that order. An approved supplier may hold the stock and dispatch the goods on Loadify's behalf, but that supplier is acting as a fulfilment provider rather than as the customer's seller.</p>
          <p>Loadify does not operate a physical warehouse. Supplier-Fulfilled stock remains with the approved supplier or fulfilment provider until dispatch. A supplier relationship, feed or technical integration does not itself make a product buyer-visible; publication remains subject to the applicable product, rights, compliance, pricing, stock and commercial-readiness controls.</p>
          <p>Independent sellers, suppliers and fulfilment providers must comply with applicable UK law, marketplace rules, intellectual-property requirements, payment-provider requirements and any product-specific obligations that apply to their role.</p>

          <h2>2. Account Registration</h2>
          <p>To use certain features of the Platform, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete information during registration</li>
            <li>Keep your account credentials secure and confidential</li>
            <li>Notify us immediately of any unauthorised access</li>
            <li>Be responsible for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or that are created with false information.</p>

          <h2>3. Independent Seller Obligations</h2>
          <p>If you register as an independent seller, you agree to:</p>
          <ul>
            <li>List only products you legally own or are authorised to sell</li>
            <li>Provide accurate descriptions, images and pricing</li>
            <li>Maintain accurate stock and fulfil orders in accordance with your stated terms</li>
            <li>Comply with applicable UK law, including consumer-protection requirements where relevant</li>
            <li>Comply with Stripe and other applicable payment-provider requirements</li>
            <li>Respond to buyer enquiries and post-purchase issues in a timely manner</li>
          </ul>

          <h2>4. Supplier-Fulfilled Products</h2>
          <p>For a Loadify Supplier-Fulfilled product, Loadify controls whether the product is eligible to be published and sold through the Platform. Supplier source data may be normalised and used to prepare buyer-facing content, but product facts, content rights, compliance evidence, stock, price and fulfilment readiness must remain supported by the relevant source and approval path.</p>
          <p>AI-assisted merchandising does not verify product facts, grant image or content rights, activate commerce or publish a product automatically.</p>

          <h2>5. Prohibited Products</h2>
          <p><strong>Counterfeit, fake branded, replica, trademark-infringing or unauthorised products are strictly prohibited on Loadify Market.</strong></p>
          <p>Listings that breach this rule may be removed immediately, and related accounts or supplier capabilities may be restricted, suspended or terminated.</p>

          <h2>6. Buyer Obligations</h2>
          <p>If you register as a buyer, you agree to:</p>
          <ul>
            <li>Pay for items purchased through the Platform</li>
            <li>Provide accurate billing and delivery information</li>
            <li>Inspect goods upon delivery and raise any issues promptly</li>
            <li>Not engage in fraudulent transactions or abusive chargebacks</li>
          </ul>

          <h2>7. Payments</h2>
          <p>Payments are processed securely by Stripe. Loadify does not store full card details.</p>
          <p>For a Marketplace Seller purchase, the named independent seller is the seller and merchant of record. Loadify may facilitate the checkout, payment hold, settlement, refund and dispute workflow through Stripe Connect and the Platform's order controls.</p>
          <p>For a Loadify Supplier-Fulfilled purchase, XDrive Logistics Ltd trading as Loadify Market is the seller and merchant of record. Payment is collected for Loadify through Stripe and is not routed to the fulfilment supplier as a customer-facing seller payment.</p>
          <p>The buyer is charged only the product price, delivery and any other mandatory amount included in the total before payment. Loadify does not impose a separate card-processing surcharge on the buyer. Marketplace seller fees and settlement rules are governed by the applicable seller terms. Loadify commission is 0% through 31 December 2026 and 7% from 1 January 2027 for the independent-seller model unless another written commercial term applies.</p>

          <h2>8. Shipping, Returns &amp; Disputes</h2>
          <p>For Marketplace Seller orders, the independent seller is responsible for fulfilment and the applicable seller return process. For Loadify Supplier-Fulfilled orders, an approved supplier may perform physical dispatch and return handling on Loadify's behalf, while Loadify remains the buyer's seller of record and coordinates the customer-facing order, return and refund process.</p>
          <p>Our <a href="/shipping-policy">Shipping Policy</a> and <a href="/returns-policy">Returns Policy</a> explain these routes in more detail. Statutory consumer rights are not affected.</p>

          <h2>9. Intellectual Property</h2>
          <p>Platform-owned content is owned by XDrive Logistics Ltd or used under licence. Seller- and supplier-provided content remains subject to the rights held by the relevant owner or licensor. You may not copy, reproduce, distribute or create derivative works from protected content without the necessary permission.</p>

          <h2>10. Moderation &amp; Enforcement Rights</h2>
          <p>To protect buyers, sellers, suppliers, payment operations and legal compliance, Loadify Market reserves the right to:</p>
          <ul>
            <li>Review suspicious listings, product data, account activity or supplier evidence</li>
            <li>Suspend, restrict or remove accounts or supplier capabilities that breach Platform rules or legal requirements</li>
            <li>Remove prohibited or non-compliant products without prior notice where appropriate</li>
            <li>Cooperate with payment providers, regulators and law-enforcement authorities where legally required</li>
          </ul>

          <h2>11. Limitation of Liability</h2>
          <p>Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, and nothing limits statutory consumer rights that apply to goods sold by Loadify. For Marketplace Seller orders, Loadify is not the independent seller and is not responsible for that seller's product quality or fulfilment except to the extent that liability arises from Loadify's own acts, omissions or legal obligations.</p>
          <p>Subject to those protections and to the maximum extent permitted by law, Loadify Market and XDrive Logistics Ltd are not liable for indirect, incidental or consequential loss arising from use of the Platform.</p>

          <h2>12. Governing Law</h2>
          <p>These Terms are governed by the laws of England and Wales. Mandatory consumer-jurisdiction rights, where applicable, are not displaced by this clause.</p>

          <h2>13. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. We will notify registered users of material changes where required. Continued use after an effective update constitutes acceptance to the extent permitted by law.</p>

          <h2>14. Contact</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <ul>
            <li>Email: contact@loadifymarket.co.uk</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
    </MainLayout>
  );
};

export default TermsAndConditions;