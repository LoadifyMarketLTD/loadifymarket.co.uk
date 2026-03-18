import { useState } from 'react';
import { Mail, MapPin, Clock, Send, CheckCircle, MessageSquare, Phone } from 'lucide-react';
import { BRAND } from '../constants/brand';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-b from-graphite/40 to-jet py-14">
        <div className="container-cinematic text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-full mb-6">
            <MessageSquare className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Get in touch with the {BRAND.name} team. We typically respond within 24 hours.
          </p>
        </div>
      </section>

      <div className="container-cinematic py-14 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-premium-sm flex-shrink-0">
                  <Mail className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Email Support</h3>
                  <a href={`mailto:${BRAND.supportEmail}`} className="text-gray-500 text-sm hover:text-gold transition-colors break-all">
                    {BRAND.supportEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-premium-sm flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Address</h3>
                  <address className="not-italic text-gray-500 text-sm leading-relaxed">
                    {BRAND.companyAddress}
                  </address>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-premium-sm flex-shrink-0">
                  <Clock className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Support Hours</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Monday – Friday<br />9:00 AM – 6:00 PM GMT
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-premium-sm flex-shrink-0">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">VAT &amp; Company</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {BRAND.companyName}<br />
                    VAT: {BRAND.vatNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Message Sent!</h2>
                <p className="text-gray-500 mb-6">
                  Thank you for contacting us. We'll get back to you at{' '}
                  <span className="text-gold">{form.email}</span> within 24 hours.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="btn-outline"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="input-field w-full"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="input-field w-full"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Subject *</label>
                    <select
                      required
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="">Select a topic...</option>
                      <option value="order">Order enquiry</option>
                      <option value="return">Return / Refund</option>
                      <option value="dispute">Dispute</option>
                      <option value="seller">Seller account</option>
                      <option value="payment">Payment issue</option>
                      <option value="technical">Technical issue</option>
                      <option value="partnership">Business / Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Message *</label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      className="input-field w-full resize-none"
                      placeholder="Please describe your enquiry in detail..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-jet border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
