import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Package,
  Globe,
  DollarSign,
  MessageSquare,
  Mail,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';

const rfqSchema = z.object({
  product_name: z.string().min(2, 'Product name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  destination_country: z.string().min(2, 'Destination country is required'),
  estimated_budget: z.string().min(1, 'Estimated budget is required'),
  message: z.string().optional(),
  buyer_email: z.string().email('Enter a valid email address'),
});

type RFQFormData = z.infer<typeof rfqSchema>;

export default function RFQPage() {
  const [searchParams] = useSearchParams();
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const prefillProduct = searchParams.get('product') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RFQFormData>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      product_name: prefillProduct,
    },
  });

  const onSubmit = async (data: RFQFormData) => {
    setSubmitState('loading');
    try {
      // NOTE: Form submission is currently handled client-side only.
      // A backend endpoint can be wired up when ready.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.info('RFQ request submitted:', data);
      setSubmitState('success');
    } catch {
      setSubmitState('error');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Breadcrumb */}
      <div className="bg-graphite/30">
        <div className="container-cinematic py-4">
          <Link
            to="/"
            className="text-white/60 hover:text-gold transition-colors flex items-center gap-2 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="container-cinematic py-12">
        {/* Page Header */}
        <div className="max-w-3xl mx-auto mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2 mb-6">
            <FileText className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-medium">B2B Wholesale Marketplace</span>
          </div>
          <h1 className="heading-section text-white mb-4">
            Request a <span className="text-gradient-gold">Wholesale Quote</span>
          </h1>
          <p className="text-white/60 text-lg">
            Submit your bulk purchase requirements and our suppliers will get back to you with
            competitive pricing.
          </p>
        </div>

        {/* Pre-fill notice */}
        {prefillProduct && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="card-glass border border-gold/20 flex items-start gap-3 py-4 px-5">
              <Package className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-semibold">
                  Product details pre-filled from your selected listing
                </p>
                <p className="text-white/60 text-xs mt-0.5">{prefillProduct}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {submitState === 'success' ? (
          <div className="max-w-2xl mx-auto">
            <div className="card-glass text-center py-16 px-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Quote Request Sent</h2>
              <p className="text-white/60 mb-8">
                Your request has been sent to suppliers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
                  Browse Marketplace
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/" className="btn-secondary inline-flex items-center gap-2">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Product & Quantity */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gold" />
                  Product Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Product Name <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('product_name')}
                        type="text"
                        placeholder="e.g. Clearance Electronics Pallet"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                    {errors.product_name && (
                      <p className="text-red-400 text-xs mt-1">{errors.product_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Quantity <span className="text-gold">*</span>
                    </label>
                    <input
                      {...register('quantity')}
                      type="text"
                      placeholder="e.g. 10 pallets / 500 units"
                      className="input-field w-full"
                    />
                    {errors.quantity && (
                      <p className="text-red-400 text-xs mt-1">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Estimated Budget <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('estimated_budget')}
                        type="text"
                        placeholder="e.g. £5,000 – £10,000"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                    {errors.estimated_budget && (
                      <p className="text-red-400 text-xs mt-1">{errors.estimated_budget.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery & Contact */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gold" />
                  Delivery & Contact
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Destination Country <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('destination_country')}
                        type="text"
                        placeholder="e.g. United Kingdom"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                    {errors.destination_country && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.destination_country.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Your Email <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('buyer_email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input-field pl-10 w-full"
                        autoComplete="email"
                      />
                    </div>
                    {errors.buyer_email && (
                      <p className="text-red-400 text-xs mt-1">{errors.buyer_email.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Additional Message{' '}
                      <span className="text-white/30 text-xs font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                      <textarea
                        {...register('message')}
                        rows={4}
                        placeholder="Describe your requirements, preferred specifications, delivery timeline, etc."
                        className="input-field pl-10 w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={submitState === 'loading'}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitState === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Request Quote
                    </>
                  )}
                </button>
                <Link to="/shop" className="btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back to Shop
                </Link>
              </div>

              {submitState === 'error' && (
                <p className="text-red-400 text-sm text-center">
                  Something went wrong. Please try again.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
