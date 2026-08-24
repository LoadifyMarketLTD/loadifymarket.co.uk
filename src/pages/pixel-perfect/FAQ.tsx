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
  return (
    <MainLayout>
      <SEO title="FAQ | Loadify Market" description="Answers to the most common questions about buying and selling on Loadify Market." canonical="/faq" />
      <main id="main-content" className="min-h-screen bg-[#F7F9FC] pt-4 pb-20 text-[#0A234F] md:pt-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav
            items={[{ label: "Home", to: "/" }, { label: "FAQ" }]}
            backTo="/"
          />
          <h1 className="mb-4 font-display text-3xl font-bold text-[#0A234F] sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-slate-600">
            Everything you need to know about using Loadify Market. Can't find an answer?{" "}
            <Link to="/contact" className="text-primary underline">
              Get in touch
            </Link>
            .
          </p>

          <div className="space-y-10">
            {FAQS.map((section) => (
              <section key={section.section}>
                <h2 className="mb-4 border-b border-slate-200 pb-2 font-display text-xl font-semibold text-[#0A234F]">
                  {section.section}
                </h2>
                <dl className="space-y-6">
                  {section.items.map((item) => (
                    <div key={item.question}>
                      <dt className="mb-1 font-semibold text-[#0A234F]">{item.question}</dt>
                      <dd className="leading-relaxed text-slate-600">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              <strong className="text-[#0A234F]">Still have a question?</strong> Our support
              team is available Monday to Friday, 09:00–17:00 (GMT).{" "}
              <Link to="/contact" className="text-primary underline">
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default FAQ;
