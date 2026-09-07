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
                <span className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-white/80">Last updated · 19 March 2026</span>
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
          <p>We may collect the following personal data:</p>
          <ul>
            <li><strong>Account information:</strong> Name, email address, phone number, business name, address</li>
            <li><strong>Transaction data:</strong> Purchase history, payment information (processed by Stripe — we do not store card details)</li>
            <li><strong>Technical data:</strong> IP address, browser type, device information, pages visited</li>
            <li><strong>Communications:</strong> Messages sent through our platform, support enquiries</li>
            <li><strong>Cookie data:</strong> As described in our Cookie Policy</li>
          </ul>

          <h2 id="how-we-use-your-data">3. How We Use Your Data</h2>
          <p>We use your personal data for the following purposes:</p>
          <ul>
            <li>To provide and maintain our marketplace platform</li>
            <li>To process transactions and payments</li>
            <li>To manage seller account setup and maintain platform records</li>
            <li>To communicate with you about your account, orders and enquiries</li>
            <li>To improve our platform and user experience</li>
            <li>To comply with legal obligations</li>
            <li>To prevent fraud and ensure platform security</li>
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
          <p>We may share your data with:</p>
          <ul>
            <li><strong>Stripe:</strong> For payment processing</li>
            <li><strong>Buyers/Sellers:</strong> Necessary transaction details to complete orders</li>
            <li><strong>Service providers:</strong> Hosting, email and analytics services that support our platform</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>

          <h2 id="data-retention">6. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active or as needed to provide our services. After account closure, we retain data for up to 6 years to comply with legal and regulatory requirements. You may request earlier deletion subject to our legal obligations.</p>

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
          <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure or destruction. All payment data is processed securely by Stripe and we do not store card details on our servers.</p>

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
