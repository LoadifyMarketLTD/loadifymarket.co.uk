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
    <section id="how-it-works-sellers" className="py-20 bg-[#0A0E1A]">
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        How It Works for Sellers
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-xl p-8 flex flex-col items-start gap-4 border border-white/5"
            style={{ background: "linear-gradient(145deg, #121A2B, #182235)" }}
          >
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-black font-semibold text-lg flex items-center justify-center">
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
