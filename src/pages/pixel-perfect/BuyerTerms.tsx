import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const BuyerTerms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Buyer Terms" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Buyer Terms</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>These Buyer Terms apply to all users who purchase goods through Loadify Market ("Platform"), operated by XDrive Logistics Ltd (Company No: 13171804, VAT: GB375949535). These terms supplement our general <a href="/terms">Terms &amp; Conditions</a>.</p>

          <h2>1. Account &amp; Eligibility</h2>
          <p>To purchase on Loadify Market, you must:</p>
          <ul>
            <li>Be at least 18 years of age</li>
            <li>Create a registered buyer account with accurate information</li>
            <li>Agree to these Buyer Terms and our general Terms &amp; Conditions</li>
          </ul>

          <h2>2. Purchasing</h2>
          <p>When you place an order on the Platform:</p>
          <ul>
            <li>You are entering into a contract directly with the seller, not with Loadify Market</li>
            <li>You agree to pay the listed price plus any applicable shipping costs and taxes</li>
            <li>Orders are confirmed once payment has been successfully processed</li>
            <li>Loadify Market may facilitate communication between you and the seller but is not a party to the sale</li>
          </ul>

          <h2>3. Payment</h2>
          <p>All payments are processed securely through our payment provider (Stripe). By making a purchase, you agree to:</p>
          <ul>
            <li>Provide valid and authorised payment details</li>
            <li>Pay the full amount at the time of purchase</li>
            <li>Not engage in chargebacks fraudulently or without attempting to resolve the issue with the seller first</li>
          </ul>

          <h2>4. Buyer Responsibilities</h2>
          <p>As a buyer, you agree to:</p>
          <ul>
            <li>Provide accurate delivery information</li>
            <li>Be available to receive deliveries or arrange collection as agreed</li>
            <li>Inspect goods upon receipt and report issues promptly</li>
            <li>Communicate with sellers in a respectful and timely manner</li>
            <li>Not misuse the Platform or engage in fraudulent activity</li>
          </ul>

          <h2>5. Returns &amp; Refunds</h2>
          <p>Returns and refunds are subject to individual seller policies and our <a href="/returns">Returns Policy</a>. Statutory consumer rights under UK law are not affected.</p>

          <h2>6. Reviews &amp; Feedback</h2>
          <p>You may leave reviews and ratings for sellers and products. Reviews must be:</p>
          <ul>
            <li>Honest, accurate and based on genuine transactions</li>
            <li>Free from offensive, defamatory or misleading content</li>
            <li>Not used to harass, intimidate or extort sellers</li>
          </ul>
          <p>We reserve the right to remove reviews that violate these standards.</p>

          <h2>7. Disputes</h2>
          <p>If you have a dispute with a seller, we encourage you to resolve it directly. If resolution is not possible, you may contact Loadify Market support. We may mediate at our discretion but are not obligated to do so.</p>

          <h2>8. Account Suspension</h2>
          <p>We may suspend or terminate your buyer account if you:</p>
          <ul>
            <li>Violate these Buyer Terms or our general Terms &amp; Conditions</li>
            <li>Engage in fraudulent or abusive behaviour</li>
            <li>Repeatedly fail to complete purchases</li>
            <li>Abuse the review or dispute system</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p>Loadify Market acts as an intermediary. We are not liable for the quality, safety, legality or delivery of goods purchased from sellers. Our liability is limited as set out in our general Terms &amp; Conditions.</p>

          <h2>10. Contact</h2>
          <p>For buyer-related queries:</p>
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

export default BuyerTerms;
