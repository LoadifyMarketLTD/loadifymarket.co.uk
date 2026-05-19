import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

export default function IntellectualPropertyComplaintsPage() {
  return (
    <MainLayout>
      <SEO
        title="Intellectual Property & Trademark Complaints | Loadify Market"
        description="Report intellectual property, trademark, and counterfeit listing complaints on Loadify Market."
        canonical="/ip-trademark-complaints"
      />
      <main id="main-content" className="flex-1 pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold mb-6">Intellectual Property &amp; Trademark Complaints</h1>
          <div className="card prose max-w-full">
            <p className="text-sm text-gray-600 mb-4">Last updated: 19 May 2026</p>

            <p>
              Loadify Market prohibits listings that infringe intellectual property rights.
              <strong> Counterfeit, fake branded, replica, trademark-infringing or unauthorised products are strictly prohibited on Loadify Market.</strong>
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">1. What You Can Report</h2>
            <ul className="list-disc pl-6 my-4">
              <li>Trademark infringement</li>
              <li>Copyright infringement</li>
              <li>Counterfeit or unauthorised branded products</li>
              <li>Product listings that falsely claim brand authorisation</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">2. How to Submit a Complaint</h2>
            <p>Please email the following details to our compliance team:</p>
            <ul className="list-disc pl-6 my-4">
              <li>Your name, organisation, and contact details</li>
              <li>Proof of rights ownership or authority to report</li>
              <li>URL(s) of the infringing listing(s)</li>
              <li>Clear explanation of the infringement claim</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">3. Our Review Process</h2>
            <p>
              We review complaints and may remove listings, suspend seller accounts, or request
              further evidence. We may cooperate with Stripe, regulators, and law-enforcement
              authorities where legally required.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">4. Contact</h2>
            <p>
              Submit complaints to{" "}
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
