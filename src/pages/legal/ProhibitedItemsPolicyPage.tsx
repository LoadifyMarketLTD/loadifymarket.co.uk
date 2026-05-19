import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";

export default function ProhibitedItemsPolicyPage() {
  return (
    <MainLayout>
      <SEO
        title="Prohibited Items Policy | Loadify Market"
        description="Read the Loadify Market Prohibited Items Policy for seller listing restrictions, moderation rights, and reporting guidance."
        canonical="/prohibited-items-policy"
      />
      <main id="main-content" className="flex-1 pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold mb-6">Prohibited Items Policy</h1>
          <div className="card prose max-w-full">
            <p className="text-sm text-gray-600 mb-4">Last updated: 19 May 2026</p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">1. Policy Scope</h2>
            <p>
              Loadify Market is a UK-based marketplace platform operated by XDrive Logistics Ltd.
              This policy applies to all sellers, including approved international sellers.
              All listings must comply with UK laws, Stripe requirements, marketplace rules,
              intellectual property regulations, shipping obligations, and consumer protection requirements.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">2. Strictly Prohibited Products</h2>
            <p>
              <strong>
                Counterfeit, fake branded, replica, trademark-infringing or unauthorised products are strictly prohibited on Loadify Market.
              </strong>
            </p>
            <p>Examples include, without limitation:</p>
            <ul className="list-disc pl-6 my-4">
              <li>Products that copy protected brands, logos, packaging, or designs without authorisation</li>
              <li>Unauthorised replicas, lookalikes, or imitation branded goods</li>
              <li>Stolen or illegally sourced merchandise</li>
              <li>Any listing that infringes intellectual property rights</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">3. Moderation &amp; Enforcement</h2>
            <p>Loadify Market reserves the right to:</p>
            <ul className="list-disc pl-6 my-4">
              <li>Manually review suspicious listings or seller activity</li>
              <li>Remove prohibited products or listings without notice</li>
              <li>Suspend, restrict, or permanently remove seller accounts</li>
              <li>Withhold or reverse payouts where legally required and contractually permitted</li>
              <li>Cooperate with Stripe, regulators, and law-enforcement authorities where legally required</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">4. Seller Responsibility</h2>
            <p>
              Sellers are solely responsible for ensuring that all listed products are lawful,
              authentic, and authorised for sale. Repeated or serious breaches may lead to
              permanent account removal and legal escalation.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">5. Related Policies</h2>
            <ul className="list-disc pl-6 my-4">
              <li>
                <Link to="/terms" className="text-secondary hover:underline">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/seller-terms" className="text-secondary hover:underline">
                  Seller Terms
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use-policy" className="text-secondary hover:underline">
                  Acceptable Use Policy
                </Link>
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">6. Related Compliance Pages</h2>
            <ul className="list-disc pl-6 my-4">
              <li>
                <Link to="/seller-verification-policy" className="text-secondary hover:underline">
                  Seller Verification Policy
                </Link>
              </li>
              <li>
                <Link to="/ip-trademark-complaints" className="text-secondary hover:underline">
                  Intellectual Property / Trademark Complaints
                </Link>
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">7. Contact</h2>
            <p>
              To report prohibited items or policy breaches, contact{" "}
              <a href="mailto:contact@loadifymarket.co.uk" className="text-secondary hover:underline">
                contact@loadifymarket.co.uk
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
