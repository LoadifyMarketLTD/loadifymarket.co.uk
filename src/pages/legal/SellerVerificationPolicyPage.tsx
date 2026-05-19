import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

export default function SellerVerificationPolicyPage() {
  return (
    <MainLayout>
      <SEO
        title="Seller Verification Policy | Loadify Market"
        description="Read the Seller Verification Policy for UK and international sellers on Loadify Market."
        canonical="/seller-verification-policy"
      />
      <main id="main-content" className="flex-1 pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold mb-6">Seller Verification Policy</h1>
          <div className="card prose max-w-full">
            <p className="text-sm text-gray-600 mb-4">Last updated: 19 May 2026</p>
            <p>
              Loadify Market is a UK-based marketplace platform. UK and international sellers may apply,
              but all sellers must pass verification requirements and comply with UK laws, Stripe requirements,
              marketplace policies, and consumer protection obligations.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">1. Verification Requirements</h2>
            <ul className="list-disc pl-6 my-4">
              <li>Accurate legal/business identity details</li>
              <li>Valid contact and operational address information</li>
              <li>Completed Stripe onboarding and any required checks</li>
              <li>Truthful product and listing information</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">2. Risk-Based Review</h2>
            <p>
              Loadify Market may apply manual review for suspicious listings, account behaviour,
              or compliance risks. Verification may be requested at onboarding or at any time while selling.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">3. Enforcement</h2>
            <p>
              We may suspend, restrict, or remove seller accounts that fail verification,
              provide false information, or breach platform and legal requirements.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">4. Contact</h2>
            <p>
              For verification questions, contact{" "}
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
