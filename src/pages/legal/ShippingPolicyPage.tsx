export default function ShippingPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Shipping Policy</h1>
      <div className="card prose max-w-none">
        <p className="text-sm text-gray-600 mb-4">Last updated: December 2025</p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Delivery Methods</h2>
        <p>Loadify Market offers two delivery methods:</p>
        <ul className="list-disc pl-6 my-4">
          <li><strong>Local Pickup:</strong> Collect your order directly from the seller</li>
          <li><strong>Courier Delivery:</strong> Seller arranges delivery via courier service</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Processing Time</h2>
        <p>
          Sellers have up to 3 business days to pack and ship your order after payment is confirmed. 
          Processing times may vary by seller.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Delivery Timeframes</h2>
        <p>
          Delivery times vary depending on the courier service selected by the seller and your location. 
          Typical delivery times are 2-5 business days within the UK.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Tracking</h2>
        <p>
          Once your order is shipped, you'll receive a tracking number via email. You can track your 
          order status on our Tracking page.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Shipping Costs</h2>
        <p>
          Shipping costs are determined by the seller and displayed at checkout. Some sellers may 
          offer free shipping on certain orders.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. International Shipping</h2>
        <p>
          International shipping availability varies by seller. Additional customs fees and duties 
          may apply for international orders.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Proof of Delivery</h2>
        <p>
          Sellers may upload proof of delivery (photos, signature) to confirm successful delivery. 
          This helps protect both buyers and sellers.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">8. Issues with Delivery</h2>
        <p>
          If you haven't received your order within the expected timeframe, please contact the seller 
          first. If the issue is not resolved, you may open a dispute.
        </p>
      </div>
    </div>
  );
}
