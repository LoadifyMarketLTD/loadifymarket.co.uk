import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { PackageSearch, CheckCircle, Send, ChevronDown } from 'lucide-react';

const PRODUCT_TYPES = [
  'Amazon Returns Pallets',
  'Electronics Clearance',
  'Wholesale Clothing',
  'Home & Garden Stock',
  'Automotive Parts',
  'Industrial Equipment',
  'Mixed Retail Pallets',
  'Other',
];

interface RequestForm {
  product_type: string;
  quantity: string;
  location: string;
  budget: string;
  notes: string;
  buyer_email: string;
}

const EMPTY_FORM: RequestForm = {
  product_type: '',
  quantity: '',
  location: '',
  budget: '',
  notes: '',
  buyer_email: '',
};

export default function RequestStockPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: dbError } = await supabase.from('stock_requests').insert({
        product_type: form.product_type,
        quantity: form.quantity,
        location: form.location,
        budget: form.budget,
        notes: form.notes,
        buyer_email: form.buyer_email,
        buyer_id: user?.id ?? null,
      });

      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof RequestForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-b from-graphite/40 to-jet py-14">
        <div className="container-cinematic text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-full mb-6">
            <PackageSearch className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Request Stock</h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Tell us what you're looking for. Verified UK sellers will reach out with
            matching pallets and wholesale stock.
          </p>
        </div>
      </section>

      <div className="container-cinematic py-14 max-w-2xl">
        {submitted ? (
          <div className="card-glass text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Request Submitted!</h2>
            <p className="text-white/60 mb-8 max-w-sm mx-auto">
              Your stock request has been published. Sellers who have matching
              inventory will contact you directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
                className="btn-outline"
              >
                Submit Another Request
              </button>
              <Link to="/shop" className="btn-primary">
                Browse Available Stock
              </Link>
            </div>
          </div>
        ) : (
          <div className="card-glass">
            <h2 className="text-xl font-bold text-white mb-6">What are you looking for?</h2>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Product Type *
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.product_type}
                    onChange={handleChange('product_type')}
                    className="input-field w-full appearance-none pr-10"
                  >
                    <option value="">Select product type…</option>
                    {PRODUCT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Quantity *
                </label>
                <input
                  type="text"
                  required
                  value={form.quantity}
                  onChange={handleChange('quantity')}
                  className="input-field w-full"
                  placeholder="e.g. 5 pallets, 100 units, 1 container"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={handleChange('location')}
                  className="input-field w-full"
                  placeholder="e.g. Birmingham, UK"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.buyer_email}
                  onChange={handleChange('buyer_email')}
                  className="input-field w-full"
                  placeholder="your@email.com"
                />
                <p className="text-white/30 text-xs mt-1">
                  Shared with verified sellers so they can contact you with offers.
                </p>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Budget
                </label>
                <input
                  type="text"
                  value={form.budget}
                  onChange={handleChange('budget')}
                  className="input-field w-full"
                  placeholder="e.g. £500-£2,000 or open to offers"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Additional Notes
                </label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={handleChange('notes')}
                  className="input-field w-full resize-none"
                  placeholder="Describe condition, grade, packaging requirements or any other details…"
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
                    Submit Request
                  </>
                )}
              </button>

              <p className="text-white/40 text-xs text-center">
                Your request will be visible to verified UK sellers.{' '}
                <Link to="/privacy" className="underline hover:text-white/60">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
