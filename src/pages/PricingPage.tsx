import { Link } from 'react-router-dom';
import { Check, Sparkles, TrendingUp, Crown } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'forever',
      description: 'For getting started',
      icon: Sparkles,
      features: [
        'Up to 5 active listings',
        '10% platform commission',
        'Basic analytics',
        'Standard support',
        'Access to buyer network',
      ],
      cta: 'Start Free',
      ctaLink: '/register?type=seller',
      popular: false,
    },
    {
      name: 'Pro',
      price: '29',
      period: 'per month',
      description: 'For serious sellers',
      icon: TrendingUp,
      features: [
        'Unlimited active listings',
        '5% platform commission',
        'Advanced analytics',
        'Priority support',
        'Featured seller badge',
      ],
      cta: 'Upgrade to Pro',
      ctaLink: '/register?type=seller&plan=pro',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored to you',
      description: 'For high-volume traders',
      icon: Crown,
      features: [
        'Unlimited listings',
        'Negotiable from 2%',
        'Dedicated account manager',
        '24/7 premium support',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      ctaLink: '/contact',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: 'How does the commission work?',
      answer:
        'Our commission is deducted from each sale you make. For example, if you sell an item for £100 and you\'re on the Free plan (10% commission), you\'ll receive £90 after the sale.',
    },
    {
      question: 'Can I change plans at any time?',
      answer:
        'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges or refunds.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, Amex) and debit cards via Stripe. Enterprise customers can arrange invoice billing.',
    },
    {
      question: 'Is there a contract or commitment?',
      answer:
        'No long-term contracts. Pro plan is billed monthly and you can cancel anytime. Free plan stays free forever.',
    },
    {
      question: 'Do you charge listing fees?',
      answer:
        'No listing fees! You only pay when you make a sale (commission) or if you choose to promote a listing for extra visibility.',
    },
    {
      question: 'What happens if I exceed my listing limit on the Free plan?',
      answer:
        'You\'ll be prompted to upgrade to Pro for unlimited listings, or you can deactivate older listings to make room for new ones.',
    },
  ];

  return (
    <div className="bg-jet min-h-screen py-12">
      {/* Header Section */}
      <section className="py-12 bg-graphite/30">
        <div className="container-cinematic text-center">
          <h1 className="heading-hero text-white mb-6">
            Simple, Transparent <span className="text-gradient-gold">Pricing</span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your business. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`card-glass relative ${
                    plan.popular ? 'ring-2 ring-gold shadow-cinematic-gold scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-jet px-4 py-1 rounded-full text-sm font-bold">
                      Most Popular
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-4">
                      <Icon className="h-8 w-8 text-gold" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-white">
                        {plan.price === 'Custom' ? '' : '£'}
                        {plan.price}
                      </span>
                      {plan.price !== 'Custom' && (
                        <span className="text-white/40 text-sm ml-2">/ {plan.period}</span>
                      )}
                      {plan.price === 'Custom' && (
                        <span className="text-white/40 text-sm block mt-2">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <span className="text-white/70 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.ctaLink}
                    className={`w-full block text-center py-3 rounded-premium-sm font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gold text-jet hover:bg-gold/90 shadow-cinematic-gold'
                        : 'bg-graphite text-white hover:bg-graphite/80'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="text-center mt-12">
            <p className="text-white/50 text-sm">
              All plans include payment processing and full access to our marketplace.
            </p>
            <p className="text-white/50 text-sm mt-2">
              VAT will be added where applicable.
            </p>
          </div>
        </div>
      </section>

      {/* Features Comparison - Optional detailed table could go here */}

      {/* FAQ Section */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic max-w-4xl">
          <h2 className="heading-section text-white text-center mb-12">
            Frequently Asked <span className="text-gradient-gold">Questions</span>
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="card-glass">
                <h3 className="text-lg font-bold text-white mb-3">{faq.question}</h3>
                <p className="text-white/60 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container-cinematic text-center">
          <div className="card-glass max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-white/60 mb-8">
              Join thousands of sellers on LoadifyMarket and start reaching buyers across the UK.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?type=seller" className="btn-primary inline-flex items-center">
                Get Started Free
              </Link>
              <Link to="/contact" className="btn-secondary inline-flex items-center">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
