export default function HowItWorksSellers() {
  const steps = [
    {
      number: 1,
      title: "Create Your Free Account",
      description:
        "Register in minutes — no fees, no card required, no monthly charges.",
    },
    {
      number: 2,
      title: "List Products or Services",
      description:
        "Upload photos, set pricing, manage stock, and publish listings instantly.",
    },
    {
      number: 3,
      title: "Get Paid via Stripe",
      description:
        "Receive fast payouts directly to your bank through Stripe Connect Express.",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
        How It Works for Sellers
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-start gap-4 border border-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 text-white font-semibold text-lg flex items-center justify-center">
              {step.number}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
            <p className="text-base text-gray-600 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
