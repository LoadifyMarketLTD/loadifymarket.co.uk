import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { ShieldCheck } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <MainLayout>
      <SEO title="Privacy Policy | Loadify Market" description="Understand how Loadify Market collects, uses, and protects your personal data in compliance with UK GDPR." canonical="/privacy" />
      <main id="main-content" className="bg-[#F7F9FC] pb-20 pt-4 text-[#0A234F] md:pt-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Privacy Policy" }]} backTo="/" />
        </div>
        <div className="container mx-auto max-w-4xl px-4">
          <section className="rounded-[26px] bg-[#0A234F] px-5 py-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.14)] sm:px-8 sm:py-9">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-[#F5A300]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Privacy & data</p>
                <h1 className="m-0 mt-2 font-display text-[30px] font-black leading-[1.05] tracking-[-0.035em] text-white sm:text-[38px]">Privacy Policy</h1>
                <p className="m-0 mt-3 max-w-2xl text-[13px] leading-6 text-white/75 sm:text-[15px]">How Loadify Market collects, uses and protects personal data.</p>
                <span className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-white/80">Last updated · 9 September 2026</span>
              </div>
            </div>
          </section>

          <nav aria-label="Privacy policy sections" className="mt-5 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_6px_20px_rgba(10,35,79,0.045)]">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">On this page</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
              <a href="#data-controller" className="rounded-full bg-[#EEF3F8] px-3 py-2 text-[#0A234F] no-underline">Data controller</a>
              <a href="#information-we-collect" className="rounded-full bg-[#EEF3F8] px-3 py-2 text-[#0A234F] no-underline">Information we collect</a>
              <a href="#your-rights" className="rounded-full bg-[#EEF3F8] px-3 py-2 text-[#0A234F] no-underline">Your rights</a>
              <a href="#data-security" className="rounded-full bg-[#EEF3F8] px-3 py-2 text-[#0A234F] no-underline">Data security</a>
              <a href="#contact" className="rounded-full bg-[#FFF4D6] px-3 py-2 text-[#9A6500] no-underline">Contact</a>
            </div>
          </nav>

          <article className="mt-5 rounded-[22px] border border-[#0A234F]/[0.08] bg-white px-5 py-6 text-[13px] leading-[1.8] text-[#5F6B7A] shadow-[0_8px_28px_rgba(10,35,79,0.045)] sm:px-8 sm:py-8 sm:text-[14px] [&_a]:font-bold [&_a]:text-[#1D57D8] [&_h2]:scroll-mt-28 [&_h2]:border-t [&_h2]:border-[#0A234F]/[0.08] [&_h2]:pt-7 [&_h2]:font-display [&_h2]:text-[20px] [&_h2]:font-black [&_h2]:leading-tight [&_h2]:tracking-[-0.02em] [&_h2]:text-[#0A234F] [&_h2:first-of-type]:border-0 [&_h2:first-of-type]:pt-0 [&_li]:my-1.5 [&_p]:my-3 [&_strong]:font-extrabold [&_strong]:text-[#24364F] [&_ul]:my-4 [&_ul]:pl-5">

          <p>This Privacy Policy explains how XDrive Logistics Ltd ("we", "us", "our"), trading as Loadify Market, collects, uses and protects your personal data when you use our website and marketplace platform. We are committed to protecting your privacy in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

          <h2 id="data-controller">1. Data Controller</h2>
          <p>The data controller is XDrive Logistics Ltd, registered in England and Wales (Company No: 13171804), with its registered office at 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom.</p>
          <p>Email: contact@loadifymarket.co.uk</p>

          <h2 id="information-we-collect">2. Information We Collect</h2>
          <p>We may collect or process the following personal data when you use Loadify Market:</p>
          <ul>
            <li><strong>Account and profile information:</strong> Name, email address, account/user ID, phone number, shipping, billing or business address, and seller/business details you provide.</li>
            <li><strong>Transaction information:</strong> Purchase and order history, order status, totals and payment processor references. Card and bank details entered in Stripe-hosted payment or onboarding pages are handled by Stripe and are not stored by Loadify Market.</li>
            <li><strong>Marketplace content:</strong> Buyer/seller messages, reviews, listings, uploaded product/profile photos, and documents such as proof-of-delivery files.</li>
            <li><strong>App activity and preferences:</strong> Search terms, wishlist/favourite actions, product interactions, notification preferences and other marketplace settings or actions.</li>
            <li><strong>Technical and diagnostics data:</strong> IP address, browser/device information, push-notification tokens or device identifiers, and crash/error diagnostic information.</li>
            <li><strong>Cookie and analytics data:</strong> Information described in our Cookie Policy, including analytics information where the relevant feature is enabled or consent is required.</li>
          </ul>

          <h2 id="how-we-use-your-data">3. How We Use Your Data</h2>
          <p>We use personal data to:</p>
          <ul>
            <li>create, authenticate and manage Loadify Market accounts;</li>
            <li>provide Buyer and Seller marketplace features, listings, orders, delivery and transaction records;</li>
            <li>process payments and seller payment onboarding through Stripe;</li>
            <li>provide chat, support, reviews, uploaded content, search, wishlist/favourites and account preferences;</li>
            <li>send account, order, message and push-notification updates;</li>
            <li>prevent fraud, enforce marketplace safety rules, investigate reports and protect the platform;</li>
            <li>diagnose crashes/errors, maintain security and improve reliability and user experience;</li>
            <li>comply with legal, accounting, tax and regulatory obligations; and</li>
            <li>perform analytics or marketing activity where permitted and, where required, with consent.</li>
          </ul>

          <h2 id="legal-basis">4. Legal Basis for Processing</h2>
          <p>We process your personal data under the following legal bases:</p>
          <ul>
            <li><strong>Contract:</strong> To fulfil our obligations when you use our platform</li>
            <li><strong>Legitimate interest:</strong> To improve our services, prevent fraud and ensure security</li>
            <li><strong>Consent:</strong> For marketing communications and non-essential cookies</li>
            <li><strong>Legal obligation:</strong> To comply with UK law and regulations</li>
          </ul>

          <h2 id="data-sharing">5. Data Sharing</h2>
          <p>We use trusted service providers and may disclose data where necessary to operate Loadify Market, including:</p>
          <ul>
            <li><strong>Stripe:</strong> Payment processing and seller payment onboarding.</li>
            <li><strong>Supabase:</strong> Authentication, database and file-storage services used by the marketplace.</li>
            <li><strong>Firebase Cloud Messaging:</strong> Push-notification delivery to supported devices.</li>
            <li><strong>Hosting, email and analytics providers:</strong> Services that support operation, communications, diagnostics and analytics where enabled.</li>
            <li><strong>Buyers and Sellers:</strong> Transaction, delivery or communication information necessary to complete marketplace activity initiated by users.</li>
            <li><strong>Legal authorities or advisers:</strong> Where disclosure is required by law or reasonably necessary to protect users, the platform or our legal rights.</li>
          </ul>
          <p>We do not sell personal data. Service providers process data only for the services and purposes described above or as otherwise permitted by law.</p>

          <h2 id="data-retention">6. Data Retention</h2>
          <p>We retain personal data only for as long as needed to provide Loadify Market, meet legal obligations, resolve disputes, prevent fraud and maintain appropriate business records.</p>
          <p>When an account-deletion request is completed, the authentication account is removed; profile, contact and storefront information is removed or anonymised; wishlist, saved-search, notification and other non-retained account activity is removed; reviews and non-transaction marketplace conversations are removed; seller listings are deactivated and uploaded product media and push-notification tokens associated with the account are removed.</p>
          <p>Some order, payment, delivery, return/dispute, transaction-linked listing or communication, moderation, fraud-prevention and audit records may be retained where necessary for accounting, security, disputes, payment reconciliation or other legal and regulatory obligations. Where required, these records may be retained for up to six years and are kept associated only with an anonymised account record where the database relationship must be preserved.</p>
          <p>You can delete your account while signed in through account settings, or request deletion without the app at <a href="/delete-account">loadifymarket.co.uk/delete-account</a>.</p>

          <h2 id="your-rights">7. Your Rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> your personal data</li>
            <li><strong>Rectify</strong> inaccurate or incomplete data</li>
            <li><strong>Erase</strong> your data (right to be forgotten)</li>
            <li><strong>Restrict</strong> processing of your data</li>
            <li><strong>Object</strong> to processing based on legitimate interest</li>
            <li><strong>Data portability</strong> — receive your data in a structured format</li>
            <li><strong>Withdraw consent</strong> at any time for consent-based processing</li>
          </ul>
          <p>To exercise any of these rights, please contact us at contact@loadifymarket.co.uk. We will respond within 30 days.</p>

          <h2 id="cookies">8. Cookies</h2>
          <p>We use cookies to improve your experience. Essential cookies are always active. Non-essential cookies (analytics, marketing) are only activated with your consent. You can manage your preferences via the cookie banner on our website.</p>

          <h2 id="data-security">9. Data Security</h2>
          <p>We use appropriate technical and organisational safeguards designed to protect personal data against unauthorised access, alteration, disclosure or destruction. Data sent between the app/browser and our services is transferred over encrypted connections.</p>
          <p>Payment card and bank details entered in Stripe-hosted payment or onboarding pages are processed by Stripe; Loadify Market does not store full card details on its servers.</p>

          <h2 id="international-transfers">10. International Transfers</h2>
          <p>Your data is primarily processed within the UK and EEA. Where data is transferred outside these areas (e.g., to service providers), we ensure appropriate safeguards are in place, such as Standard Contractual Clauses.</p>

          <h2 id="changes">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice on our website. The "Last updated" date at the top of this page indicates when this policy was last revised.</p>

          <h2 id="complaints">12. Complaints</h2>
          <p>If you are not satisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary">ico.org.uk</a>.</p>

          <h2 id="contact">13. Contact</h2>
          <p>For any privacy-related questions or requests, please contact us at:</p>
          <ul>
            <li>Email: contact@loadifymarket.co.uk</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
          </article>
        </div>
      </main>
    </MainLayout>
  );
};

export default PrivacyPolicy;
