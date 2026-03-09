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
  ExternalLink,
} from 'lucide-react';
import { buildXDriveAppUrl } from '../lib/transportQuote';
import type { DeliveryRequest, DeliveryRequestStatus } from '../types';

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

const DELIVERY_REQUESTS_KEY = 'loadify_delivery_requests';

function saveDeliveryRequest(req: DeliveryRequest): void {
  try {
    const existing: DeliveryRequest[] = JSON.parse(
      localStorage.getItem(DELIVERY_REQUESTS_KEY) || '[]',
    );
    existing.unshift(req);
    localStorage.setItem(DELIVERY_REQUESTS_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch {
    // localStorage may be unavailable; silently skip persistence
  }
}

export default function TransportQuotePage() {
  const [searchParams] = useSearchParams();
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savedRequest, setSavedRequest] = useState<DeliveryRequest | null>(null);

  // Pre-fill data from query params
  const listingId = searchParams.get('listing') || '';
  const listingTitle = searchParams.get('title') || '';
  const pickupLocation = searchParams.get('pickup') || '';
  const dropoffLocation = searchParams.get('dropoff') || '';
  const palletCount = searchParams.get('pallets') || '';
  const weight = searchParams.get('weight') || '';
  const sellerId = searchParams.get('sellerId') || '';
  const sellerName = searchParams.get('sellerName') || '';
  const category = searchParams.get('category') || '';
  const qty = searchParams.get('qty') || '';
  const source = searchParams.get('source') || 'loadify-market';

  const hasListingContext = !!(listingId || listingTitle);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransportQuoteFormData>({
    resolver: zodResolver(transportQuoteSchema),
    defaultValues: {
      pickupPostcode: pickupLocation,
      dropoffPostcode: dropoffLocation,
      palletCount: palletCount,
      weight: weight ? `${weight} kg` : '',
      itemType: listingTitle || '',
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
      // Build the delivery request record
      const requestId = `dr-${crypto.randomUUID()}`;
      const newRequest: DeliveryRequest = {
        id: requestId,
        listingId,
        listingTitle: listingTitle || data.itemType,
        sellerId,
        sellerName,
        buyerName: data.fullName,
        buyerEmail: data.email,
        pickupPostcode: data.pickupPostcode,
        dropoffPostcode: data.dropoffPostcode,
        palletCount: data.palletCount,
        weight: data.weight,
        itemType: data.itemType,
        category,
        quantity: qty,
        status: 'submitted' as DeliveryRequestStatus,
        source,
        createdAt: new Date().toISOString(),
      };

      // Send via Netlify email function
      const emailPayload = {
        to: (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'loadifymarket.co.uk@gmail.com',
        subject: `Transport Quote Request — ${newRequest.listingTitle || 'Loadify Market'}`,
        template: 'transport_quote_request',
        data: {
          requestId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          companyName: data.companyName || '',
          pickupPostcode: data.pickupPostcode,
          dropoffPostcode: data.dropoffPostcode,
          itemType: data.itemType,
          palletCount: data.palletCount,
          weight: data.weight || '',
          dimensions: data.dimensions || '',
          collectionDate: data.collectionDate,
          deliveryNotes: data.deliveryNotes || '',
          listingReference: data.listingReference || '',
          listingId,
          listingTitle,
          sellerId,
          sellerName,
          category,
          quantity: qty,
          source,
        },
      };

      const resp = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });

      if (!resp.ok) {
        // If the function returns a non-OK status, still mark success for the
        // user (the request is persisted locally) but log the issue.
        console.warn('Transport email function responded with', resp.status);
      }

      // Persist to localStorage so the seller dashboard can read it
      saveDeliveryRequest(newRequest);
      setSavedRequest(newRequest);
      setSubmitState('success');
    } catch (err) {
      console.error('Transport quote submission error:', err);
      setSubmitState('error');
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Build XDrive app deep-link (used in success state)
  const xdriveDeepLink = savedRequest
    ? buildXDriveAppUrl({
        source: 'loadify-market',
        ref: savedRequest.id,
        listing: savedRequest.listingId,
        title: savedRequest.listingTitle,
        pickup: savedRequest.pickupPostcode,
        dropoff: savedRequest.dropoffPostcode,
        pallets: savedRequest.palletCount,
        weight: savedRequest.weight,
        seller: savedRequest.sellerId,
        sellerName: savedRequest.sellerName,
      })
    : buildXDriveAppUrl({ source: 'loadify-market' });

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

        {/* Listing context block — shown when opened from a product */}
        {hasListingContext && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="card-glass border border-gold/20 py-4 px-5">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold mb-1">
                    Delivery request for a Loadify Market listing
                  </p>
                  {listingTitle && (
                    <p className="text-white/80 text-sm font-medium truncate">{listingTitle}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                    {sellerName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {sellerName}
                      </span>
                    )}
                    {pickupLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Pickup: {pickupLocation}
                      </span>
                    )}
                    {palletCount && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {palletCount} pallets
                      </span>
                    )}
                    {weight && (
                      <span className="flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        {weight} kg
                      </span>
                    )}
                    {qty && (
                      <span className="flex items-center gap-1">
                        Qty: {qty}
                      </span>
                    )}
                  </div>
                </div>
                {listingId && (
                  <Link
                    to={`/product/${listingId}`}
                    className="text-gold/60 hover:text-gold transition-colors flex-shrink-0 text-xs underline"
                  >
                    View listing
                  </Link>
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
              <h2 className="text-2xl font-bold text-white mb-4">Quote Request Submitted</h2>
              <p className="text-white/60 mb-2">
                Your delivery request has been submitted to XDrive Logistics.
              </p>
              <p className="text-white/60 mb-6">
                A member of the XDrive Logistics team will be in touch within 1 business day.
              </p>
              {savedRequest && (
                <div className="bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-left mb-8">
                  <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Request summary</p>
                  <p className="text-white text-sm font-semibold mb-1 truncate">{savedRequest.listingTitle || savedRequest.itemType}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>Pickup: {savedRequest.pickupPostcode || '—'}</span>
                    <span>Dropoff: {savedRequest.dropoffPostcode || '—'}</span>
                    {savedRequest.palletCount && <span>Pallets: {savedRequest.palletCount}</span>}
                    <span className="text-gold/70">Status: Submitted</span>
                  </div>
                  <p className="text-white/30 text-xs mt-2">Ref: {savedRequest.id}</p>
                </div>
              )}
              {/* XDrive app deep-link */}
              <div className="mb-8">
                <a
                  href={xdriveDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Open in XDrive Logistics App
                  <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-white/30 text-xs mt-2">
                  Opens app.xdrivelogistics.co.uk with your request pre-loaded
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/shop" className="btn-secondary inline-flex items-center gap-2">
                  Browse Marketplace
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/" className="btn-glass inline-flex items-center gap-2">
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
