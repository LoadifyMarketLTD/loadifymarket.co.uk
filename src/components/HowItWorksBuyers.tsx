export default function HowItWorksBuyers() {
  const steps = [
    {
      number: 1,
      title: "Browse & Discover",
      description: "Find products from verified UK sellers across all categories.",
    },
    {
      number: 2,
      title: "Secure Checkout",
      description:
        "Pay safely via Stripe Checkout with full encryption and buyer protection.",
    },
    {
      number: 3,
      title: "Delivered to You",
      description:
        "Track your order from your buyer dashboard until it arrives.",
    },
  ];

  return (
    <section id="how-it-works-buyers" className="py-20 bg-[#020617]">
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        How It Works for Buyers
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-xl p-8 flex flex-col items-start gap-4 border border-white/5"
            style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)" }}
          >
            <div className="w-10 h-10 rounded-full bg-[#FBBF24] text-black font-semibold text-lg flex items-center justify-center">
              {step.number}
            </div>
            <h3 className="text-xl font-semibold text-white">{step.title}</h3>
            <p className="text-base text-slate-400 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
