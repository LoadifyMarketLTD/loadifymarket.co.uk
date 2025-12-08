import { Upload, MessageSquare, TrendingUp, DollarSign } from 'lucide-react';

export default function CinematicStoryStrip() {
  const steps = [
    {
      id: 1,
      icon: Upload,
      title: 'Post a load or product',
      description: 'List your logistics job, pallet stock, or handmade item in minutes',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 2,
      icon: MessageSquare,
      title: 'Get offers from drivers or buyers',
      description: 'Connect with verified drivers and buyers in our trusted network',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 3,
      icon: TrendingUp,
      title: 'Track jobs & orders live',
      description: 'Real-time updates from pickup to delivery with full transparency',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 4,
      icon: DollarSign,
      title: 'Get paid securely',
      description: 'Safe, protected payments with automatic seller payouts',
      color: 'from-gold-500 to-amber-500',
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From listing to payment, we've streamlined every step of your marketplace journey
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="relative group"
              >
                {/* Connector line (hidden on mobile, shown on desktop except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-200 z-0"></div>
                )}

                {/* Card */}
                <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-100 z-10">
                  {/* Step number */}
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-navy-800 to-navy-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {step.id}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${step.color} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-navy-900 mb-2 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <a
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-navy-800 to-navy-900 hover:from-navy-900 hover:to-black text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Get Started Today
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
