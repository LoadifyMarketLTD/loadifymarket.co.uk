import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Legal", to: "/terms" }, { label: "Cookie Policy" }]} backTo="/" />
        </div>
        <div className="container mx-auto px-4 max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-display">
          <h1>Cookie Policy</h1>
          <p className="text-muted-foreground"><strong>Last updated:</strong> 19 March 2026</p>

          <p>This Cookie Policy explains how Loadify Market ("we", "us", "our"), operated by XDrive Logistics Ltd (Company No: 13171804), uses cookies and similar tracking technologies when you visit our website.</p>

          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files placed on your device when you visit a website. They help the website recognise your device and remember information about your visit, such as your preferences and settings.</p>

          <h2>2. Types of Cookies We Use</h2>

          <h3>Essential Cookies</h3>
          <p>These cookies are necessary for the website to function properly. They enable core features such as security, session management and accessibility. You cannot opt out of these cookies.</p>
          <ul>
            <li><strong>Session cookies</strong> — maintain your login state</li>
            <li><strong>Security cookies</strong> — protect against fraud and unauthorised access</li>
            <li><strong>Cookie consent</strong> — remember your cookie preferences</li>
          </ul>

          <h3>Functional Cookies</h3>
          <p>These cookies allow us to remember choices you make (such as language, region or display preferences) and provide enhanced, personalised features.</p>

          <h3>Analytics Cookies</h3>
          <p>We use analytics cookies to understand how visitors interact with our website. This helps us improve the user experience. Data collected is aggregated and anonymous.</p>
          <ul>
            <li><strong>Google Analytics</strong> — tracks page views, session duration and user journeys</li>
            <li><strong>Performance monitoring</strong> — measures page load times and errors</li>
          </ul>

          <h3>Marketing Cookies</h3>
          <p>These cookies are used to deliver advertisements relevant to you and your interests. They also help limit the number of times you see an advert and measure the effectiveness of advertising campaigns.</p>

          <h2>3. How to Manage Cookies</h2>
          <p>When you first visit our website, you will see a cookie consent banner that allows you to:</p>
          <ul>
            <li><strong>Accept All</strong> — enable all cookie categories</li>
            <li><strong>Reject All</strong> — disable all non-essential cookies</li>
            <li><strong>Customise</strong> — choose which categories to allow</li>
          </ul>
          <p>You can change your cookie preferences at any time by clearing your browser's local storage and revisiting the site.</p>
          <p>You can also control cookies through your browser settings. Most browsers allow you to block or delete cookies. Please note that disabling cookies may affect the functionality of our website.</p>

          <h2>4. Third-Party Cookies</h2>
          <p>Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. Third parties that may set cookies include:</p>
          <ul>
            <li>Google (Analytics)</li>
            <li>Stripe (Payment processing)</li>
            <li>Social media platforms (if you interact with embedded content)</li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>Cookie lifespans vary depending on their purpose:</p>
          <ul>
            <li><strong>Session cookies</strong> — deleted when you close your browser</li>
            <li><strong>Persistent cookies</strong> — retained for up to 12 months</li>
            <li><strong>Analytics cookies</strong> — retained for up to 26 months</li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>Under UK GDPR and the Privacy and Electronic Communications Regulations (PECR), you have the right to:</p>
          <ul>
            <li>Be informed about cookies we use</li>
            <li>Choose which non-essential cookies to accept</li>
            <li>Withdraw consent at any time</li>
            <li>Request information about data collected via cookies</li>
          </ul>

          <h2>7. Changes to This Policy</h2>
          <p>We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.</p>

          <h2>8. Contact</h2>
          <p>If you have questions about our use of cookies, please contact us:</p>
          <ul>
            <li>Email: loadifymarket.co.uk@gmail.com</li>
            <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, UK</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
