import BreadcrumbNav from "@/components/BreadcrumbNav";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const SUPPORT_EMAIL = "contact@loadifymarket.co.uk";
const DELETE_REQUEST_HREF =
  "mailto:contact@loadifymarket.co.uk?subject=Loadify%20Market%20account%20deletion%20request&body=Please%20delete%20my%20Loadify%20Market%20account.%0A%0AEmail%20used%20for%20the%20account%3A%20%0AName%20(optional)%3A%20%0A%0APlease%20do%20not%20include%20your%20password%20or%20payment%20card%20details.";

export default function DeleteAccount() {
  return (
    <MainLayout>
      <SEO
        title="Delete Account | Loadify Market"
        description="Request deletion of your Loadify Market account and associated personal data."
        canonical="/delete-account"
      />

      <main id="main-content" className="pt-4 pb-20 md:pt-28">
        <div className="container mx-auto max-w-4xl px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Legal", to: "/privacy" },
              { label: "Delete Account" },
            ]}
            backTo="/"
          />
        </div>
        <div className="container mx-auto max-w-4xl px-4">
          <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-display">
            <h1>Delete your Loadify Market account</h1>
            <p className="text-lg text-muted-foreground">
              This is the public account-deletion page for <strong>Loadify Market</strong>,
              operated by <strong>XDrive Logistics Ltd</strong>. You can request deletion even
              if you no longer have the Android app installed.
            </p>

            <section id="request-deletion" className="not-prose mt-8 rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight">Request account deletion</h2>
              <p className="mt-3 text-muted-foreground">
                Send the request from the email address associated with your Loadify Market account.
                We may contact you to verify that you own the account before completing deletion.
              </p>
              <a
                href={DELETE_REQUEST_HREF}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90"
              >
                Email account deletion request
              </a>
              <p className="mt-4 text-sm text-muted-foreground">
                Email: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </p>
            </section>
            <h2>What to include in your request</h2>
            <ul>
              <li>The email address used for your Loadify Market account.</li>
              <li>Your name, if it helps us identify the account.</li>
              <li>A clear statement that you want your Loadify Market account deleted.</li>
            </ul>
            <p>
              Do not send your password, payment card number, security codes or other sensitive
              authentication information.
            </p>

            <h2>Delete directly while signed in</h2>
            <p>
              If you can still sign in on the Loadify Market website or app, you can also use the
              account deletion option in your account settings. The external email option above is
              available if you cannot access the app or prefer to make the request from the web.
            </p>

            <h2>What happens when your account is deleted</h2>
            <p>When a valid deletion request is completed, Loadify Market will:</p>
            <ul>
              <li>remove the authentication account;</li>
              <li>remove or anonymise profile, contact and storefront information;</li>
              <li>remove wishlist, saved-search, notification and other non-retained account activity;</li>
              <li>remove reviews and non-transaction marketplace conversations;</li>
              <li>deactivate seller product listings and remove uploaded product media associated with the deleted account;</li>
              <li>remove push-notification tokens associated with the account.</li>
            </ul>

            <h2>Data we may retain</h2>
            <p>
              Some order, payment, delivery, return/dispute, transaction-linked listing or
              communication, moderation, fraud-prevention and audit records may be retained where
              necessary for accounting, security, disputes, payment reconciliation or other legal
              and regulatory obligations. Where required, these records may be retained for up to
              six years and linked only to an anonymised account record where necessary.
            </p>
            <p>
              Loadify Market does not store your payment card details. Payment card processing is
              handled by Stripe.
            </p>

            <h2>How long it takes</h2>
            <p>
              We aim to acknowledge and process verified deletion requests as quickly as practical
              and normally within 30 days, subject to identity verification and any lawful retention
              requirements.
            </p>

            <h2>Privacy information</h2>
            <p>
              For more information about how Loadify Market handles personal data, see our{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
