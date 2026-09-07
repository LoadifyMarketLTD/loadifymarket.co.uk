import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, CircleHelp, Search } from "lucide-react";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import { Link } from "react-router-dom";
import { BRAND } from "@/constants/brand";
import SEO from "@/components/SEO";

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

const FAQS: { section: string; items: FaqItem[] }[] = [
  {
    section: "About Loadify Market",
    items: [
      {
        question: "What is Loadify Market?",
        answer: (
          <>
            Loadify Market is a UK-based multi-category online marketplace.
            Independent sellers list and manage their own inventory — covering electronics,
            fashion, home & garden, toys, handmade goods and more — while buyers browse,
            compare and purchase directly from sellers. We are operated by{" "}
            <strong>XDrive Logistics Ltd</strong> (Co. No: 13171804), registered in England
            and Wales.
          </>
        ),
      },
      {
        question: "Does the platform hold or store products?",
        answer:
          "No. Loadify Market does not own, store or dispatch any products. All products are listed, managed and fulfilled by independent sellers. The platform connects buyers and sellers and processes payments via Stripe.",
      },
      {
        question: "Who can use Loadify Market?",
        answer:
          "Loadify Market is UK-based. Buyers in supported regions can register, and international sellers may apply to sell if they comply with UK laws, Stripe requirements, marketplace rules, intellectual property regulations, shipping obligations, and consumer protection requirements. Both B2B and B2C transactions are supported.",
      },
    ],
  },
  {
    section: "Accounts & Registration",
    items: [
      {
        question: "How do I create an account?",
        answer: (
          <>
            Visit the{" "}
            <Link to="/register" className="text-primary underline">
              Register
            </Link>{" "}
            page and complete the sign-up form. Your account is activated immediately — no
            email confirmation is required.
          </>
        ),
      },
      {
        question: "How do I become a seller?",
        answer: (
          <>
            After registering, choose the <strong>Seller</strong> role during sign-up or from
            your account dashboard. You will need to complete your business profile and connect
            a Stripe account. Seller accounts are subject to compliance checks, and we may
            manually review suspicious listings or account activity before or after activation.
          </>
        ),
      },
      {
        question: "How does seller activation and moderation work?",
        answer:
          "Your seller account can be activated once you complete your business profile (name, phone, address) and connect a Stripe account with payments enabled. We reserve the right to manually review suspicious listings, remove prohibited products without notice, and suspend or remove sellers that breach platform or legal requirements.",
      },
      {
        question: "Can I have both a buyer and seller account?",
        answer:
          "Yes. A single account can act as both buyer and seller. Switch between buyer and seller views from your account dashboard.",
      },
    ],
  },
  {
    section: "Buying on Loadify",
    items: [
      {
        question: "How do I find and buy a product?",
        answer: (
          <>
            Browse by{" "}
            <Link to="/catalog" className="text-primary underline">
              category
            </Link>{" "}
            or use the search bar to find products. Click a listing to view full details,
            then add to cart and proceed to checkout.
          </>
        ),
      },
      {
        question: "Can I request a custom quote?",
        answer:
          "Yes. If you have specific requirements, use the Request for Quote feature to describe what you need. Registered sellers in the relevant category can respond with details and pricing, and you can purchase directly at their listed price.",
      },
      {
        question: "What payment methods are accepted?",
        answer:
          "Payments are processed securely via Stripe. We accept all major debit and credit cards. Your card details are never stored on our servers.",
      },
      {
        question: "When am I charged?",
        answer:
          "You are charged at the time of purchase when you complete checkout.",
      },
    ],
  },
  {
    section: "Selling on Loadify",
    items: [
      {
        question: "How do I list a product?",
        answer: (
          <>
            From your{" "}
            <Link to="/seller" className="text-primary underline">
              Seller Dashboard
            </Link>{" "}
            go to <strong>Products → New Listing</strong>. Fill in the title, description,
            category, price and product quantity, then publish when ready.
          </>
        ),
      },
      {
        question: "How do I receive payouts?",
        answer:
          "Connect your Stripe Express account from the Payouts tab in your Seller Dashboard. Once connected, earnings from completed orders are automatically transferred to your bank account, minus the platform commission.",
      },
      {
        question: "What commission does Loadify Market charge?",
        answer:
          "Loadify Market charges a 7% commission on all completed sales, deducted automatically from each order. During our launch promotion — until 31 December 2026 — new sellers benefit from 0% commission. Standard fees apply from 1 January 2027 onwards.",
      },
      {
        question: "How do I manage orders?",
        answer: (
          <>
            All incoming orders appear in your{" "}
            <Link to="/seller/orders" className="text-primary underline">
              Seller Orders
            </Link>{" "}
            section. Update the order status as you pack and ship, and use the
            messaging feature to communicate with buyers directly on each order.
          </>
        ),
      },
    ],
  },
  {
    section: "Orders & Cancellations",
    items: [
      {
        question: "What is the order lifecycle?",
        answer: (
          <ol className="list-decimal list-inside space-y-1">
            <li>
              <strong>Paid</strong> — buyer completes checkout via Stripe
            </li>
            <li>
              <strong>Packed</strong> — seller confirms the order is prepared
            </li>
            <li>
              <strong>Shipped</strong> — seller adds courier name and tracking number
            </li>
            <li>
              <strong>Delivered</strong> — order is confirmed delivered
            </li>
          </ol>
        ),
      },
      {
        question: "Can I cancel an order?",
        answer:
          "Cancellations can be requested by either the buyer or seller before the order is packed. Cancellation and refund terms are governed by our Terms & Conditions and the individual seller's returns policy.",
      },
      {
        question: "How do I raise a dispute?",
        answer: (
          <>
            If you have a problem with an order, first use the in-order messaging to contact
            the other party. If the issue cannot be resolved, contact our support team via the{" "}
            <Link to="/contact" className="text-primary underline">
              Contact page
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    section: "Trust & Safety",
    items: [
      {
        question: "How does seller activation work?",
        answer:
          "Sellers must complete their business profile and connect a Stripe account with payments enabled before they can list products. This is checked automatically — there is no manual review step for normal seller accounts. Sellers who do not meet these requirements cannot list until their setup is complete.",
      },
      {
        question: "Is my payment secure?",
        answer:
          "All payments are processed by Stripe, a PCI-DSS Level 1 certified payment provider. Loadify Market never stores your card details.",
      },
      {
        question: "How are reviews moderated?",
        answer:
          "Reviews can only be submitted by buyers who have completed a verified order. We reserve the right to remove reviews that violate our community guidelines.",
      },
      {
        question: "Are counterfeit, fake branded or replica products allowed?",
        answer: (
          <>
            <strong>Counterfeit, fake branded, replica, trademark-infringing or unauthorised products are strictly prohibited on Loadify Market.</strong>{" "}
            Listings may be removed immediately and seller accounts may be restricted or suspended.
            Read our{" "}
            <Link to="/prohibited-items-policy" className="text-primary underline">
              Prohibited Items Policy
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    section: "Technical & Legal",
    items: [
      {
        question: "Where can I find your Terms & Conditions?",
        answer: (
          <Link to="/terms" className="text-primary underline">
            Terms &amp; Conditions
          </Link>
        ),
      },
      {
        question: "Where can I find your Prohibited Items Policy?",
        answer: (
          <Link to="/prohibited-items-policy" className="text-primary underline">
            Prohibited Items Policy
          </Link>
        ),
      },
      {
        question: "Where can I find your Seller Verification Policy?",
        answer: (
          <Link to="/seller-verification-policy" className="text-primary underline">
            Seller Verification Policy
          </Link>
        ),
      },
      {
        question: "How do I report trademark or IP infringement?",
        answer: (
          <Link to="/ip-trademark-complaints" className="text-primary underline">
            Intellectual Property / Trademark Complaints
          </Link>
        ),
      },
      {
        question: "Where can I find your Privacy Policy?",
        answer: (
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
        ),
      },
      {
        question: "How do I contact support?",
        answer: (
          <>
            Use our{" "}
            <Link to="/contact" className="text-primary underline">
              Contact page
            </Link>{" "}
            or email us at{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="text-primary underline">
              {BRAND.supportEmail}
            </a>
            .
          </>
        ),
      },
    ],
  },
];

const FAQ = () => {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("All");

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return FAQS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const matchesSection = activeSection === "All" || section.section === activeSection;
        const matchesQuery = !normalizedQuery
          || item.question.toLowerCase().includes(normalizedQuery)
          || section.section.toLowerCase().includes(normalizedQuery);
        return matchesSection && matchesQuery;
      }),
    })).filter((section) => section.items.length > 0);
  }, [activeSection, query]);

  return (
    <MainLayout>
      <SEO title="FAQ | Loadify Market" description="Answers to the most common questions about buying and selling on Loadify Market." canonical="/faq" />
      <main id="main-content" className="min-h-screen bg-[#F7F9FC] pb-20 pt-4 text-[#0A234F] md:pt-28">
        <div className="container mx-auto max-w-5xl px-4">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Help Centre" }]} backTo="/" />

          <section className="overflow-hidden rounded-[26px] bg-[#0A234F] px-5 py-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.14)] sm:px-8 sm:py-9">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-[#F5A300]">
                <CircleHelp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Loadify support</p>
                <h1 className="m-0 mt-2 font-display text-[30px] font-black leading-[1.05] tracking-[-0.035em] text-white sm:text-[38px]">Help Centre</h1>
                <p className="m-0 mt-3 max-w-2xl text-[13px] leading-6 text-white/75 sm:text-[15px]">
                  Clear answers for buying, selling, orders, accounts and marketplace safety.
                </p>
              </div>
            </div>

            <label className="mt-6 flex h-12 items-center gap-3 rounded-[14px] bg-white px-4 text-[#0A234F] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <Search className="h-[18px] w-[18px] shrink-0 text-[#667085]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the Help Centre"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-semibold text-[#0A234F] outline-none placeholder:font-medium placeholder:text-[#98A2B3]"
                aria-label="Search Help Centre"
              />
            </label>
          </section>

          <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["All", ...FAQS.map((section) => section.section)].map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-extrabold transition-colors ${activeSection === section
                  ? "border-[#0A234F] bg-[#0A234F] text-white"
                  : "border-[#0A234F]/10 bg-white text-[#526071]"}`}
              >
                {section}
              </button>
            ))}
          </div>
          <div className="mt-8 space-y-8">
            {visibleSections.map((section) => (
              <section key={section.section}>
                <div className="mb-3 flex items-center gap-3 px-1">
                  <span className="h-6 w-1 rounded-full bg-[#F5A300]" aria-hidden="true" />
                  <div>
                    <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">Help topic</p>
                    <h2 className="m-0 mt-0.5 font-display text-[19px] font-black tracking-[-0.02em] text-[#0A234F]">{section.section}</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.question}
                      className="group overflow-hidden rounded-[17px] border border-[#0A234F]/[0.08] bg-white shadow-[0_6px_20px_rgba(10,35,79,0.045)]"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-left [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 flex-1 text-[14px] font-extrabold leading-[1.35] text-[#0A234F] sm:text-[15px]">
                          {item.question}
                        </span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF3F8] text-[#0A234F]">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                        </span>
                      </summary>
                      <div className="border-t border-[#0A234F]/[0.07] bg-[#FBFCFE] px-4 py-4">
                        <div className="text-[13px] leading-[1.75] text-[#5F6B7A] [&_a]:font-bold [&_a]:text-[#1D57D8] [&_li]:my-1 [&_strong]:font-extrabold [&_strong]:text-[#24364F]">
                          {item.answer}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {visibleSections.length === 0 ? (
            <section className="mt-8 rounded-[18px] border border-[#0A234F]/[0.08] bg-white px-5 py-8 text-center shadow-[0_6px_20px_rgba(10,35,79,0.04)]">
              <p className="m-0 text-[14px] font-extrabold text-[#0A234F]">No matching help article found</p>
              <p className="m-0 mt-1 text-[12px] text-[#7A8493]">Try another phrase or browse all Help Centre topics.</p>
              <button type="button" onClick={() => { setQuery(""); setActiveSection("All"); }} className="mt-4 text-[12px] font-extrabold text-[#1D57D8]">Show all topics</button>
            </section>
          ) : null}
          <section className="mt-10 rounded-[20px] border border-[#F5A300]/30 bg-[#FFF9EC] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-[#9A6500]">Still need help?</p>
              <p className="m-0 mt-1 text-[15px] font-black text-[#0A234F]">Talk to the Loadify support team</p>
              <p className="m-0 mt-1 text-[12px] leading-6 text-[#667085]">Use the contact page when you need help with a specific account, order or marketplace issue.</p>
            </div>
            <Link to="/contact" className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#0A234F] px-4 text-[12px] font-extrabold text-white no-underline sm:mt-0">
              Contact support <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </MainLayout>
  );
};

export default FAQ;
