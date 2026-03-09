import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Truck,
  MapPin,
  Package,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Building2,
  Weight,
  Ruler,
  FileText,
  Phone,
  Mail,
  User,
} from 'lucide-react';

const transportQuoteSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  companyName: z.string().optional(),
  pickupPostcode: z.string().min(5, 'Enter a valid pickup postcode'),
  dropoffPostcode: z.string().min(5, 'Enter a valid dropoff postcode'),
  itemType: z.string().min(2, 'Describe the item type'),
  palletCount: z.string().min(1, 'Enter number of pallets or items'),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  collectionDate: z.string().min(1, 'Select a collection date'),
  deliveryNotes: z.string().optional(),
  listingReference: z.string().optional(),
});

type TransportQuoteFormData = z.infer<typeof transportQuoteSchema>;

export default function TransportQuotePage() {
  const [searchParams] = useSearchParams();
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Pre-fill data from query params (Step 4 — prefill from listing)
  const listingId = searchParams.get('listing') || '';
  const listingTitle = searchParams.get('title') || '';
  const pickupLocation = searchParams.get('pickup') || '';
  const palletCount = searchParams.get('pallets') || '';
  const weight = searchParams.get('weight') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransportQuoteFormData>({
    resolver: zodResolver(transportQuoteSchema),
    defaultValues: {
      pickupPostcode: pickupLocation,
      palletCount: palletCount,
      weight: weight,
      listingReference: listingId
        ? `${listingId}${listingTitle ? ` — ${listingTitle}` : ''}`
        : '',
    },
  });

  // Today's date for min date on collection date input
  const today = new Date().toISOString().split('T')[0];

  const onSubmit = async (data: TransportQuoteFormData) => {
    setSubmitState('loading');
    try {
      // NOTE: Form submission is currently handled client-side only.
      // A Netlify function endpoint (/netlify/functions/send-email) exists and can be
      // wired up when the backend is ready. For now, we simulate a successful submission.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.info('Transport quote request:', data);
      setSubmitState('success');
    } catch {
      setSubmitState('error');
    }
  };

  // Scroll to top on mount
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
            <Truck className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-medium">
              Transport support provided by XDrive Logistics
            </span>
          </div>
          <h1 className="heading-section text-white mb-4">
            Request a <span className="text-gradient-gold">Transport Quote</span>
          </h1>
          <p className="text-white/60 text-lg">
            We help coordinate collection and delivery for marketplace orders, pallet deals, and
            wholesale stock.
          </p>
        </div>

        {/* Pre-fill notice */}
        {(listingTitle || listingId) && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="card-glass border border-gold/20 flex items-start gap-3 py-4 px-5">
              <Package className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-semibold">
                  Listing details pre-filled from your selected item
                </p>
                {listingTitle && (
                  <p className="text-white/60 text-xs mt-0.5">{listingTitle}</p>
                )}
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
              <h2 className="text-2xl font-bold text-white mb-4">Quote Request Received</h2>
              <p className="text-white/60 mb-2">
                Thank you. Your transport quote request has been submitted.
              </p>
              <p className="text-white/60 mb-8">
                A member of the XDrive Logistics team will be in touch within 1 business day.
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
              {/* Contact Details */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-gold" />
                  Contact Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Full Name <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('fullName')}
                        type="text"
                        placeholder="Your full name"
                        className="input-field pl-10 w-full"
                        autoComplete="name"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email Address <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input-field pl-10 w-full"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Phone Number <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+44 7700 000000"
                        className="input-field pl-10 w-full"
                        autoComplete="tel"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Company Name{' '}
                      <span className="text-white/30 text-xs font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('companyName')}
                        type="text"
                        placeholder="Your company"
                        className="input-field pl-10 w-full"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection & Delivery */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold" />
                  Collection & Delivery
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Pickup Postcode <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('pickupPostcode')}
                        type="text"
                        placeholder="e.g. BB1 9QL"
                        className="input-field pl-10 w-full uppercase"
                        autoComplete="postal-code"
                      />
                    </div>
                    {errors.pickupPostcode && (
                      <p className="text-red-400 text-xs mt-1">{errors.pickupPostcode.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Dropoff Postcode <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('dropoffPostcode')}
                        type="text"
                        placeholder="e.g. M1 1AE"
                        className="input-field pl-10 w-full uppercase"
                        autoComplete="postal-code"
                      />
                    </div>
                    {errors.dropoffPostcode && (
                      <p className="text-red-400 text-xs mt-1">{errors.dropoffPostcode.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Collection Date <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('collectionDate')}
                        type="date"
                        min={today}
                        className="input-field pl-10 w-full"
                      />
                    </div>
                    {errors.collectionDate && (
                      <p className="text-red-400 text-xs mt-1">{errors.collectionDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cargo Details */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gold" />
                  Cargo Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Item Type <span className="text-gold">*</span>
                    </label>
                    <input
                      {...register('itemType')}
                      type="text"
                      placeholder="e.g. Electronics pallet, mixed wholesale stock, furniture"
                      className="input-field w-full"
                    />
                    {errors.itemType && (
                      <p className="text-red-400 text-xs mt-1">{errors.itemType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Number of Pallets / Items <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('palletCount')}
                        type="text"
                        placeholder="e.g. 2 pallets, 5 boxes"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                    {errors.palletCount && (
                      <p className="text-red-400 text-xs mt-1">{errors.palletCount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Total Weight{' '}
                      <span className="text-white/30 text-xs font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('weight')}
                        type="text"
                        placeholder="e.g. 500 kg"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Dimensions{' '}
                      <span className="text-white/30 text-xs font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('dimensions')}
                        type="text"
                        placeholder="e.g. 120 × 100 × 150 cm per pallet"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="card-glass">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" />
                  Additional Information
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Delivery Notes{' '}
                      <span className="text-white/30 text-xs font-normal">(optional)</span>
                    </label>
                    <textarea
                      {...register('deliveryNotes')}
                      rows={4}
                      placeholder="Any special requirements, access restrictions, handling instructions..."
                      className="input-field w-full resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Listing / Product Reference{' '}
                      <span className="text-white/30 text-xs font-normal">(if applicable)</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        {...register('listingReference')}
                        type="text"
                        placeholder="e.g. Listing #123 — Electronics Pallet"
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error State */}
              {submitState === 'error' && (
                <div className="card-glass border border-red-500/30 flex items-start gap-3 py-4 px-5">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-semibold">Something went wrong</p>
                    <p className="text-white/60 text-xs mt-0.5">
                      Please try again or contact us directly at{' '}
                      <Link
                        to="/contact"
                        className="text-gold hover:underline"
                      >
                        our contact page
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  disabled={submitState === 'loading'}
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitState === 'loading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-jet border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Truck className="w-5 h-5" />
                      Request Quote
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-white/40 text-sm">
                  We'll respond within 1 business day.
                </p>
              </div>

              {/* Operator note */}
              <p className="text-white/30 text-xs text-center pb-6">
                Transport quotes are coordinated by XDrive Logistics Ltd — Operated by XDrive
                Logistics Ltd, VAT: GB375949535
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
