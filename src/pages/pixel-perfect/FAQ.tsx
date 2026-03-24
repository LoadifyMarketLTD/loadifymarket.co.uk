import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { Link } from "react-router-dom";
import { BRAND } from "@/constants/brand";

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
            Loadify Market is a UK-based online marketplace connecting buyers and sellers of
            services in transport, logistics, equipment hire, and related industries. We are
            operated by <strong>XDrive Logistics Ltd</strong> (Co. No: 13171804), registered in
            England and Wales.
          </>
        ),
      },
      {
        question: "Do you hold or ship any physical products?",
        answer:
          "No. Loadify Market is a services marketplace — we do not hold stock, operate a warehouse, or manage physical deliveries. All transactions are for services offered by registered sellers on the platform.",
      },
      {
        question: "Who can use Loadify Market?",
        answer:
          "Any UK-based business or individual can register as a buyer. To sell on the platform you must complete your seller profile and connect a Stripe account. Both B2B and B2C transactions are supported.",
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
            a Stripe account. Once all setup steps are complete, your seller account is
            activated automatically — no manual review required.
          </>
        ),
      },
      {
        question: "How does seller activation work?",
        answer:
          "Your seller account is activated automatically once you complete your business profile (name, phone, address) and connect a Stripe account with payments enabled. There is no manual approval step for normal seller accounts.",
      },
      {
        question: "Can I have both a buyer and seller account?",
        answer:
          "Yes. A single account can act as both buyer and seller. Switch between buyer and seller views from your account dashboard.",
      },
    ],
  },
  {
    section: "Buying Services",
    items: [
      {
        question: "How do I find and book a service?",
        answer: (
          <>
            Browse by{" "}
            <Link to="/catalog" className="text-primary underline">
              category
            </Link>{" "}
            or use the search bar to find services. Click a listing to view full details,
            then use the <strong>Book / Request</strong> button to start the booking process.
          </>
        ),
      },
      {
        question: "Can I request a custom quote?",
        answer:
          "Yes. If you have specific requirements, use the Request for Quote feature to describe what you need. Verified sellers in the relevant category can then submit offers for you to review and accept.",
      },
      {
        question: "What payment methods are accepted?",
        answer:
          "Payments are processed securely via Stripe. We accept all major debit and credit cards. Your card details are never stored on our servers.",
      },
      {
        question: "When am I charged?",
        answer:
          "For fixed-price services you are charged at the time of booking. For quote-based bookings you are charged when you accept a quote and confirm the order.",
      },
    ],
  },
  {
    section: "Selling Services",
    items: [
      {
        question: "How do I list a service?",
        answer: (
          <>
            From your{" "}
            <Link to="/seller" className="text-primary underline">
              Seller Dashboard
            </Link>{" "}
            go to <strong>Services → New Service</strong>. Fill in the title, description,
            pricing model, and category, then publish when ready.
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
          "Commission rates vary by category and are displayed in your seller agreement during onboarding. The commission is deducted automatically from each completed order.",
      },
      {
        question: "How do I manage orders?",
        answer: (
          <>
            All incoming orders appear in your{" "}
            <Link to="/seller/orders" className="text-primary underline">
              Seller Orders
            </Link>{" "}
            section. You can accept, start, and mark orders as complete from there. Use the
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
              <strong>Requested</strong> — buyer places order
            </li>
            <li>
              <strong>Accepted</strong> — seller confirms
            </li>
            <li>
              <strong>In Progress</strong> — service is being delivered
            </li>
            <li>
              <strong>Completed</strong> — service delivered and confirmed
            </li>
          </ol>
        ),
      },
      {
        question: "Can I cancel an order?",
        answer:
          "Cancellations can be requested by either the buyer or seller before the service reaches In Progress status. Cancellation and refund terms are governed by our Terms & Conditions and the individual seller's cancellation policy.",
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
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav
            items={[{ label: "Home", to: "/" }, { label: "FAQ" }]}
            backTo="/"
          />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Everything you need to know about using Loadify Market. Can't find an answer?{" "}
            <Link to="/contact" className="text-primary underline">
              Get in touch
            </Link>
            .
          </p>

          <div className="space-y-10">
            {FAQS.map((section) => (
              <section key={section.section}>
                <h2 className="text-xl font-display font-semibold text-foreground mb-4 pb-2 border-b border-border">
                  {section.section}
                </h2>
                <dl className="space-y-6">
                  {section.items.map((item) => (
                    <div key={item.question}>
                      <dt className="font-semibold text-foreground mb-1">{item.question}</dt>
                      <dd className="text-muted-foreground leading-relaxed">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Still have a question?</strong> Our support
              team is available Monday to Friday, 09:00–17:00 (GMT).{" "}
              <Link to="/contact" className="text-primary underline">
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
