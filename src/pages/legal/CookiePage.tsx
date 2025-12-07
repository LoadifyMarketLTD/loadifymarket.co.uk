export default function CookiePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Cookie Policy</h1>
      <div className="card prose max-w-none">
        <p className="text-sm text-gray-600 mb-4">Last updated: December 2025</p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-3">1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit our website. They help us 
          provide you with a better experience.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Types of Cookies We Use</h2>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
          <li><strong>Authentication Cookies:</strong> Keep you logged in</li>
          <li><strong>Shopping Cart Cookies:</strong> Remember items in your cart</li>
          <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Managing Cookies</h2>
        <p>
          You can control cookies through your browser settings. Note that disabling cookies may 
          affect website functionality.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Contact</h2>
        <p>
          For questions about our use of cookies, contact loadifymarket.co.uk@gmail.com.
        </p>
      </div>
    </div>
  );
}
