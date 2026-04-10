
import MainLayout from "@/layouts/MainLayout";

export default function AcceptableUsePolicyPage() {
  return (
    <MainLayout>
      <main className="flex-1 pt-16 lg:pt-[104px] pb-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Acceptable Use Policy</h1>
      <div className="card prose max-w-full">
        <p className="text-sm text-gray-600 mb-4">Last updated: December 2025</p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Introduction</h2>
        <p>
          This Acceptable Use Policy ("AUP") sets out the rules governing the use of the Loadify Market
          platform operated by XDrive Logistics Ltd (Company No: 13171804, VAT: GB375949535). By using our platform, you
          agree to comply with this policy.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Prohibited Content</h2>
        <p>You must not list, upload, or share any content that:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Is illegal under UK law or the laws of any applicable jurisdiction</li>
          <li>Infringes any intellectual property, trademark, or copyright</li>
          <li>Is fraudulent, misleading, or deceptive</li>
          <li>Contains malware, viruses, or harmful code</li>
          <li>Promotes violence, hatred, or discrimination</li>
          <li>Involves counterfeit, stolen, or prohibited goods</li>
          <li>Violates consumer protection regulations</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Prohibited Activities</h2>
        <p>When using our platform, you must not:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Create fake or duplicate accounts</li>
          <li>Manipulate reviews or feedback</li>
          <li>Circumvent our payment system or fees</li>
          <li>Scrape or harvest data from the platform without authorisation</li>
          <li>Conduct transactions outside the platform to avoid fees</li>
          <li>Spam other users with unsolicited messages or offers</li>
          <li>Impersonate another person or entity</li>
          <li>Attempt to gain unauthorised access to any part of the platform</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Seller Obligations</h2>
        <p>Sellers on Loadify Market must:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Accurately describe all products and their condition</li>
          <li>Only list items they have the legal right to sell</li>
          <li>Fulfil orders promptly and as described</li>
          <li>Comply with all UK consumer protection and distance selling regulations</li>
          <li>Maintain accurate stock levels and pricing</li>
          <li>Respond to buyer queries within a reasonable timeframe</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Buyer Obligations</h2>
        <p>Buyers on Loadify Market must:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Provide accurate delivery and contact information</li>
          <li>Complete purchases made in good faith</li>
          <li>Not raise fraudulent disputes or chargebacks</li>
          <li>Use the platform only for lawful purchasing purposes</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Enforcement</h2>
        <p>
          We reserve the right to investigate any suspected breach of this policy. If we determine a
          violation has occurred, we may take one or more of the following actions:
        </p>
        <ul className="list-disc pl-6 my-4">
          <li>Issue a formal warning</li>
          <li>Remove listings or content</li>
          <li>Suspend or permanently ban your account</li>
          <li>Withhold or reverse payments</li>
          <li>Report the matter to relevant law enforcement authorities</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Reporting Violations</h2>
        <p>
          If you become aware of any content or activity that breaches this policy, please report it to
          us at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-[#1E3A5F] hover:underline">
            loadifymarket.co.uk@gmail.com
          </a>
          . We take all reports seriously and will investigate promptly.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Changes to This Policy</h2>
        <p>
          We may update this Acceptable Use Policy from time to time. Continued use of the platform
          following any changes constitutes your acceptance of the revised policy.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">9. Contact</h2>
        <p>
          For questions about this policy, please contact us at{' '}
          <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-[#1E3A5F] hover:underline">
            loadifymarket.co.uk@gmail.com
          </a>{' '}
          or by post at: XDrive Logistics Ltd (trading as Loadify Market), 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom.
        </p>
      </div>
        </div>
      </main>
    </MainLayout>
  );
}
