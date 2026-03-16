import { Link } from 'react-router-dom';
import {
  ShieldCheck, Package, AlertTriangle, RotateCcw, MessageCircle,
  Clock, CheckCircle, ChevronRight, Truck, HelpCircle,
} from 'lucide-react';
import { BRAND } from '../constants/brand';
import { DISPUTE_TIMELINE, RESOLUTION_TYPES } from '../lib/buyerProtection';

const PROTECTION_CONDITIONS = [
  { icon: Package,       title: 'Item Not Received',        desc: 'Your order never arrived after the estimated delivery date.' },
  { icon: AlertTriangle, title: 'Item Not as Described',    desc: 'The product received is significantly different from the listing.' },
  { icon: Package,       title: 'Item Arrived Damaged',     desc: 'Your item was damaged in transit or is defective.' },
  { icon: CheckCircle,   title: 'Defective Product',        desc: 'The product doesn\'t function as described by the seller.' },
  { icon: MessageCircle, title: 'Seller Not Responding',    desc: 'The seller has not replied to your messages within 48 hours.' },
];

const PROCESS_STEPS = [
  { step: 1, title: 'Open a Dispute',       desc: 'Go to My Orders, select the order, and click Open Dispute. Choose a protection reason and describe the issue.', icon: AlertTriangle },
  { step: 2, title: 'Seller Responds',      desc: 'The seller has 48 hours to respond. If they miss the deadline, the case is automatically escalated to our admin team.', icon: MessageCircle },
  { step: 3, title: 'Platform Review',      desc: 'Our trust and safety team reviews all evidence — messages, photos, order history — and makes an impartial decision.', icon: ShieldCheck },
  { step: 4, title: 'Resolution Issued',    desc: 'You\'ll receive a resolution within 5 business days. Possible outcomes: full refund, partial refund, or replacement.', icon: CheckCircle },
];

export default function BuyerProtectionPage() {
  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-b from-graphite/40 to-jet py-16">
        <div className="container-cinematic text-center max-w-3xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gold/10 rounded-full mb-6">
            <ShieldCheck className="w-10 h-10 text-gold" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Buyer Protection
          </h1>
          <p className="text-white/60 text-lg mb-8">
            Every purchase on {BRAND.name} is protected. If something goes wrong, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/disputes" className="btn-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Open a Dispute
            </Link>
            <Link to="/help" className="btn-outline flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Help Centre
            </Link>
          </div>
        </div>
      </section>

      <div className="container-cinematic py-16 max-w-5xl">

        {/* Trust badge strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { icon: ShieldCheck, label: '100% Purchase Protection' },
            { icon: RotateCcw,   label: `${BRAND.returnsDays}-Day Returns` },
            { icon: Clock,       label: '5-Day Resolution' },
            { icon: Truck,       label: 'Escrow Payments' },
          ].map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="card-glass text-center py-6">
                <Icon className="w-8 h-8 text-gold mx-auto mb-3" />
                <p className="text-white font-semibold text-sm">{f.label}</p>
              </div>
            );
          })}
        </div>

        {/* When you're protected */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">When Are You Protected?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROTECTION_CONDITIONS.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="card-glass flex items-start gap-4">
                  <div className="p-2.5 bg-gold/10 rounded-premium-sm shrink-0">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{c.title}</p>
                    <p className="text-white/80 text-xs leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-white/40 text-xs mt-4">
            Protection is valid for 90 days from the date of purchase. Items must be purchased through {BRAND.name} checkout.
          </p>
        </section>

        {/* Dispute process */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the Dispute Process Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PROCESS_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="card-glass flex items-start gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-jet font-bold text-sm shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <p className="font-bold text-white mb-1">{step.title}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <Icon className="absolute bottom-4 right-4 w-5 h-5 text-white/10" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Dispute Timeline</h2>
          <div className="card-glass">
            <div className="flex flex-col sm:flex-row gap-0 sm:gap-0 relative">
              {/* Connector line */}
              <div className="hidden sm:block absolute top-6 left-0 right-0 h-0.5 bg-white/10 z-0" style={{ left: '8%', right: '8%' }} />
              {DISPUTE_TIMELINE.map((event, i) => (
                <div key={i} className="flex-1 flex flex-col items-center text-center p-4 relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 font-bold text-sm ${
                    event.isDeadline ? 'bg-gold/20 border-2 border-gold text-gold' : 'bg-graphite text-white/60'
                  }`}>
                    Day {event.day}
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">{event.label}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resolution types */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Possible Resolutions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {RESOLUTION_TYPES.filter(r => r.key !== 'withdrawn' && r.key !== 'rejected').map(r => (
              <div key={r.key} className="card-glass border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="font-bold text-white text-sm">{r.label}</p>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Refund policy */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Refund Policy</h2>
          <div className="card-glass space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-white/90">Refunds are issued within <strong className="text-white">3–5 business days</strong> of an approved resolution, returned to your original payment method.</p>
            </div>
            <div className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-white/90">Returns must be submitted within <strong className="text-white">{BRAND.returnsDays} days</strong> of delivery. Items must be in original condition where possible.</p>
            </div>
            <div className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-white/90">Payments are held in <strong className="text-white">escrow</strong> until delivery is confirmed. Funds are never released to the seller during an open dispute.</p>
            </div>
            <div className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-white/90">Handmade, custom, and digital items may have different return conditions as specified on the product listing.</p>
            </div>
          </div>
        </section>

        {/* Abuse protection notice */}
        <section className="mb-16">
          <div className="card-glass border border-yellow-400/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white mb-2">Abuse Prevention</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {BRAND.name} monitors for misuse of the buyer protection system. Buyers who repeatedly open fraudulent disputes may have their accounts suspended and may be liable for any losses incurred. Admin has the authority to reject disputes and suspend accounts where abuse is detected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="card-glass py-12">
            <ShieldCheck className="w-14 h-14 text-gold mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-3">Need to Open a Dispute?</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Go to your orders, find the affected order, and click Open Dispute. Our team will help resolve your case.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/orders" className="btn-primary flex items-center gap-2">
                <Package className="w-4 h-4" /> My Orders
              </Link>
              <Link to="/contact" className="btn-outline flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
