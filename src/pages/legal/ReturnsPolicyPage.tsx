export default function ReturnsPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Returns Policy</h1>
      <div className="card prose max-w-none">
        <p className="text-sm text-gray-600 mb-4">Last updated: December 2025</p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-3">1. Return Period</h2>
        <p>
          You have 14 calendar days from the date of delivery to initiate a return request.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">2. Eligible Returns</h2>
        <p>Items may be returned if:</p>
        <ul className="list-disc pl-6 my-4">
          <li>The item is damaged or defective</li>
          <li>You received the wrong item</li>
          <li>The item does not match the description</li>
          <li>You changed your mind (product must be unused and in original packaging)</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">3. Return Process</h2>
        <ol className="list-decimal pl-6 my-4">
          <li>Go to your Orders page</li>
          <li>Select the order you want to return</li>
          <li>Click "Request Return" and provide reason</li>
          <li>Upload photos if applicable</li>
          <li>Wait for seller approval</li>
        </ol>

        <h2 className="text-2xl font-semibold mt-6 mb-3">4. Refunds</h2>
        <p>
          Once the return is approved and the seller confirms receipt of the item in acceptable 
          condition, a refund will be processed to your original payment method within 5-10 business days.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">5. Return Shipping</h2>
        <p>
          For damaged or incorrect items, the seller covers return shipping. For change of mind returns, 
          the buyer is responsible for return shipping costs.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3">6. Non-Returnable Items</h2>
        <p>Some items cannot be returned:</p>
        <ul className="list-disc pl-6 my-4">
          <li>Perishable goods</li>
          <li>Custom or personalized items</li>
          <li>Digital products</li>
          <li>Items marked as "final sale"</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-3">7. Disputes</h2>
        <p>
          If you and the seller cannot agree on a return, you may open a dispute through our 
          Dispute Center where our admin team will help resolve the issue.
        </p>
      </div>
    </div>
  );
}
