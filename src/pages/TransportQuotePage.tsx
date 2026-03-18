import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
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
  Clock,
  Shield,
  Upload,
  Settings2,
} from 'lucide-react';
import { buildXDriveAppUrl } from '../lib/transportQuote';
import type { DeliveryRequest, DeliveryRequestStatus } from '../types';

const YES_NO = ['', 'Yes', 'No'] as const;

const transportQuoteSchema = z.object({
  // Section 1 — Contact
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  companyName: z.string().optional(),

  // Section 2 — Collection & Delivery
  pickupPostcode: z.string().min(5, 'Enter a valid pickup postcode'),
  dropoffPostcode: z.string().min(5, 'Enter a valid dropoff postcode'),
  collectionDate: z.string().min(1, 'Select a collection date'),
  preferredCollectionTime: z.string().optional(),
  preferredDeliveryTime: z.string().optional(),

  // Section 3 — Cargo Details
  itemType: z.string().min(2, 'Describe the item type'),
  palletCount: z.string().min(1, 'Enter number of pallets or items'),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  vehicleType: z.string().optional(),

  // Section 4 — Operational / Handling
  tailLift: z.string().optional(),
  forkliftPickup: z.string().optional(),
  forkliftDropoff: z.string().optional(),
  fragile: z.string().optional(),
  stackable: z.string().optional(),
  goodsReadyNow: z.string().optional(),
  accessRestrictions: z.string().optional(),

  // Section 5 — Additional
  deliveryNotes: z.string().optional(),
  listingReference: z.string().optional(),

  // Section 6 — Consent
  gdprConsent: z.boolean().refine((v) => v === true, 'You must agree to the privacy policy'),
  quoteTerms: z.boolean().refine((v) => v === true, 'You must acknowledge the quote terms'),
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

const TIME_WINDOWS = [
  '',
  'AM (07:00–12:00)',
  'PM (12:00–17:00)',
  'Early Morning (07:00–09:00)',
  'Morning (09:00–12:00)',
  'Afternoon (12:00–15:00)',
  'Late Afternoon (15:00–18:00)',
  'Evening (18:00–21:00)',
  'Flexible / Any Time',
];

const VEHICLE_TYPES = [
  '',
  'Small Van (up to 1.5t)',
  'Luton Van (up to 3.5t)',
  '7.5t Rigid',
  '18t Rigid',
  'Artic / 44t',
  'Flatbed',
  'Temperature Controlled',
  'Not Sure — Please Advise',
];

function YesNoSelect({
  id,
  label,
  registration,
  optional = true,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">
        {label}{' '}
        {optional && <span className="text-gray-300 font-normal">(optional)</span>}
      </label>
      <select
        id={id}
        {...registration}
        className="input-field-sm w-full"
      >
        {YES_NO.map((v) => (
          <option key={v} value={v} className="bg-white text-gray-900">
            {v === '' ? '— Select —' : v}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TransportQuotePage() {
  const [searchParams] = useSearchParams();
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savedRequest, setSavedRequest] = useState<DeliveryRequest | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      gdprConsent: false,
      quoteTerms: false,
    },
  });

  const today = new Date().toISOString().split('T')[0];

  const onSubmit = async (data: TransportQuoteFormData) => {
    setSubmitState('loading');
    try {
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

      const emailPayload = {
        to:
          (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ||
          'loadifymarket.co.uk@gmail.com',
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
          collectionDate: data.collectionDate,
          preferredCollectionTime: data.preferredCollectionTime || '',
          preferredDeliveryTime: data.preferredDeliveryTime || '',
          itemType: data.itemType,
          palletCount: data.palletCount,
          weight: data.weight || '',
          dimensions: data.dimensions || '',
          vehicleType: data.vehicleType || '',
          tailLift: data.tailLift || '',
          forkliftPickup: data.forkliftPickup || '',
          forkliftDropoff: data.forkliftDropoff || '',
          fragile: data.fragile || '',
          stackable: data.stackable || '',
          goodsReadyNow: data.goodsReadyNow || '',
          accessRestrictions: data.accessRestrictions || '',
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
        console.warn('Transport email function responded with', resp.status);
        setEmailSent(false);
      }

      saveDeliveryRequest(newRequest);
      setSavedRequest(newRequest);
      setSubmitState('success');
    } catch (err) {
      console.error('Transport quote submission error:', err);
      setSubmitState('error');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    <div className="bg-[#F8F9FA] min-h-screen pt-20">
      {/* Breadcrumb */}
      <div className="bg-white/30">
        <div className="container-cinematic py-3">
          <Link
            to="/"
            className="text-gray-500 hover:text-gold transition-colors flex items-center gap-1.5 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="container-cinematic py-6">
        {/* Page Header — compact */}
        <div className="max-w-4xl mx-auto mb-5 text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5 mb-3">
            <Truck className="w-3.5 h-3.5 text-gold" />
            <span className="text-gold text-xs font-medium">
              Transport support provided by XDrive Logistics
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Request a <span className="text-gradient-gold">Transport Quote</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Collection & delivery for marketplace orders, pallet deals, and wholesale stock.
          </p>
        </div>

        {/* Listing context block */}
        {hasListingContext && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="bg-gray-50 border border-gold/20 rounded-xl py-3 px-4">
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-[#F4C400] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-xs font-semibold mb-0.5">
                    Delivery request for a Loadify Market listing
                  </p>
                  {listingTitle && (
                    <p className="text-gray-700 text-xs font-medium truncate">{listingTitle}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
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
                    {qty && <span>Qty: {qty}</span>}
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
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-12 px-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Quote Request Submitted</h2>
              <p className="text-gray-500 text-sm mb-1">
                Your delivery request has been submitted to XDrive Logistics.
              </p>
              {emailSent ? (
                <p className="text-gray-500 text-sm mb-5">
                  A member of the XDrive Logistics team will be in touch within 1 business day.
                </p>
              ) : (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-5 text-left">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300/90 text-sm">
                    Your request has been saved locally. The email notification could not be
                    delivered right now — please contact us directly to confirm your request.
                  </p>
                </div>
              )}
              {savedRequest && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-left mb-6">
                  <p className="text-gray-400 text-xs mb-1.5 uppercase tracking-wider">
                    Request summary
                  </p>
                  <p className="text-gray-900 text-sm font-semibold mb-1 truncate">
                    {savedRequest.listingTitle || savedRequest.itemType}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>Pickup: {savedRequest.pickupPostcode || '—'}</span>
                    <span>Dropoff: {savedRequest.dropoffPostcode || '—'}</span>
                    {savedRequest.palletCount && <span>Pallets: {savedRequest.palletCount}</span>}
                    <span className="text-[#F4C400]/80">Status: Submitted</span>
                  </div>
                  <p className="text-gray-300 text-xs mt-2">Ref: {savedRequest.id}</p>
                </div>
              )}
              <div className="mb-6">
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
                <p className="text-gray-300 text-xs mt-1.5">
                  Opens app.xdrivelogistics.co.uk with your request pre-loaded
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
            <div className="max-w-4xl mx-auto space-y-4">

              {/* SECTION 1 — Contact Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <User className="w-4 h-4 text-gold" />
                  Contact Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">
                      Full Name <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <User className="field-icon" />
                      <input
                        {...register('fullName')}
                        type="text"
                        placeholder="Your full name"
                        className="input-field-sm pl-9 w-full"
                        autoComplete="name"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="field-error">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Email Address <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="field-icon" />
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input-field-sm pl-9 w-full"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="field-error">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Phone Number <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="field-icon" />
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+44 7700 000000"
                        className="input-field-sm pl-9 w-full"
                        autoComplete="tel"
                      />
                    </div>
                    {errors.phone && (
                      <p className="field-error">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Company Name{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="field-icon" />
                      <input
                        {...register('companyName')}
                        type="text"
                        placeholder="Your company"
                        className="input-field-sm pl-9 w-full"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 — Collection & Delivery */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <MapPin className="w-4 h-4 text-gold" />
                  Collection &amp; Delivery
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">
                      Pickup Postcode <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="field-icon" />
                      <input
                        {...register('pickupPostcode')}
                        type="text"
                        placeholder="e.g. BB1 9QL"
                        className="input-field-sm pl-9 w-full uppercase"
                        autoComplete="postal-code"
                      />
                    </div>
                    {errors.pickupPostcode && (
                      <p className="field-error">{errors.pickupPostcode.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Dropoff Postcode <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="field-icon" />
                      <input
                        {...register('dropoffPostcode')}
                        type="text"
                        placeholder="e.g. M1 1AE"
                        className="input-field-sm pl-9 w-full uppercase"
                        autoComplete="postal-code"
                      />
                    </div>
                    {errors.dropoffPostcode && (
                      <p className="field-error">{errors.dropoffPostcode.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Collection Date <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="field-icon" />
                      <input
                        {...register('collectionDate')}
                        type="date"
                        min={today}
                        className="input-field-sm pl-9 w-full"
                      />
                    </div>
                    {errors.collectionDate && (
                      <p className="field-error">{errors.collectionDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Preferred Collection Time{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Clock className="field-icon" />
                      <select
                        {...register('preferredCollectionTime')}
                        className="input-field-sm pl-9 w-full"
                      >
                        {TIME_WINDOWS.map((t) => (
                          <option key={t} value={t} className="bg-white text-gray-900">
                            {t === '' ? '— Any Time —' : t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="field-label">
                      Preferred Delivery Time Window{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Clock className="field-icon" />
                      <select
                        {...register('preferredDeliveryTime')}
                        className="input-field-sm pl-9 w-full"
                      >
                        {TIME_WINDOWS.map((t) => (
                          <option key={t} value={t} className="bg-white text-gray-900">
                            {t === '' ? '— Any Time —' : t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3 — Cargo Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <Package className="w-4 h-4 text-gold" />
                  Cargo Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="field-label">
                      Item Type <span className="text-gold">*</span>
                    </label>
                    <input
                      {...register('itemType')}
                      type="text"
                      placeholder="e.g. Electronics pallet, mixed wholesale stock, furniture"
                      className="input-field-sm w-full"
                    />
                    {errors.itemType && (
                      <p className="field-error">{errors.itemType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Number of Pallets / Items <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <Package className="field-icon" />
                      <input
                        {...register('palletCount')}
                        type="text"
                        placeholder="e.g. 2 pallets, 5 boxes"
                        className="input-field-sm pl-9 w-full"
                      />
                    </div>
                    {errors.palletCount && (
                      <p className="field-error">{errors.palletCount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="field-label">
                      Total Weight{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Weight className="field-icon" />
                      <input
                        {...register('weight')}
                        type="text"
                        placeholder="e.g. 500 kg"
                        className="input-field-sm pl-9 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">
                      Dimensions{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Ruler className="field-icon" />
                      <input
                        {...register('dimensions')}
                        type="text"
                        placeholder="e.g. 120×100×150 cm"
                        className="input-field-sm pl-9 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">
                      Vehicle Type Needed{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Truck className="field-icon" />
                      <select
                        {...register('vehicleType')}
                        className="input-field-sm pl-9 w-full"
                      >
                        {VEHICLE_TYPES.map((v) => (
                          <option key={v} value={v} className="bg-white text-gray-900">
                            {v === '' ? '— Select —' : v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4 — Operational / Handling Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <Settings2 className="w-4 h-4 text-gold" />
                  Operational / Handling Details
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <YesNoSelect
                    id="tailLift"
                    label="Tail Lift Required?"
                    registration={register('tailLift')}
                  />
                  <YesNoSelect
                    id="forkliftPickup"
                    label="Forklift at Pickup?"
                    registration={register('forkliftPickup')}
                  />
                  <YesNoSelect
                    id="forkliftDropoff"
                    label="Forklift at Dropoff?"
                    registration={register('forkliftDropoff')}
                  />
                  <YesNoSelect
                    id="fragile"
                    label="Fragile Goods?"
                    registration={register('fragile')}
                  />
                  <YesNoSelect
                    id="stackable"
                    label="Stackable?"
                    registration={register('stackable')}
                  />
                  <YesNoSelect
                    id="goodsReadyNow"
                    label="Goods Ready Now?"
                    registration={register('goodsReadyNow')}
                  />
                  <div className="col-span-2 sm:col-span-3">
                    <label className="field-label">
                      Access Restrictions{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <input
                      {...register('accessRestrictions')}
                      type="text"
                      placeholder="e.g. Height restriction 3m, no HGV access, key-code gate"
                      className="input-field-sm w-full"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5 — Additional Information */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <FileText className="w-4 h-4 text-gold" />
                  Additional Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="field-label">
                      Delivery Notes{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <textarea
                      {...register('deliveryNotes')}
                      rows={3}
                      placeholder="Special requirements, handling instructions, or anything else we should know..."
                      className="input-field-sm w-full resize-none"
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Listing / Product Reference{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <FileText className="field-icon" />
                      <input
                        {...register('listingReference')}
                        type="text"
                        placeholder="e.g. Listing #123"
                        className="input-field-sm pl-9 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">
                      Upload Photos / Documents{' '}
                      <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <div
                      className="border border-dashed border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:border-gold/40 transition-colors bg-white/3"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 text-xs">
                        {uploadedFiles.length > 0
                          ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} selected`
                          : 'Click to upload (images, PDF)'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          setUploadedFiles(Array.from(e.target.files || []))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6 — Consent + CTA */}
              <div className="bg-white border border-gray-200 rounded-xl p-6-compact">
                <h2 className="section-heading-sm">
                  <Shield className="w-4 h-4 text-gold" />
                  Consent &amp; Submit
                </h2>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      {...register('gdprConsent')}
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-gray-200 bg-gray-500 text-gold focus:ring-gold/30 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-gray-500 text-sm group-hover:text-gray-700 transition-colors">
                      I agree to the{' '}
                      <Link to="/privacy" className="text-[#1E3A5F] hover:underline">
                        Privacy Policy
                      </Link>{' '}
                      and consent to Loadify Market / XDrive Logistics processing my data to provide
                      a transport quote.{' '}
                      <span className="text-gold text-xs">*</span>
                    </span>
                  </label>
                  {errors.gdprConsent && (
                    <p className="field-error ml-7">{errors.gdprConsent.message}</p>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      {...register('quoteTerms')}
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-gray-200 bg-gray-500 text-gold focus:ring-gold/30 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-gray-500 text-sm group-hover:text-gray-700 transition-colors">
                      I understand this is a quote request only. No charges will be made until I
                      accept a quote in writing. <span className="text-gold text-xs">*</span>
                    </span>
                  </label>
                  {errors.quoteTerms && (
                    <p className="field-error ml-7">{errors.quoteTerms.message}</p>
                  )}
                </div>

                {/* Error State */}
                {submitState === 'error' && (
                  <div className="mt-3 border border-red-500/30 bg-red-500/5 rounded-lg flex items-start gap-3 py-3 px-4">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 text-sm font-semibold">Something went wrong</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Please try again or{' '}
                        <Link to="/contact" className="text-[#1E3A5F] hover:underline">
                          contact us directly
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitState === 'loading'}
                    className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitState === 'loading' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-jet border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        Request Quote
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-gray-400 text-xs">We'll respond within 1 business day.</p>
                </div>

                <p className="text-gray-400 text-xs mt-3">
                  Transport quotes coordinated by XDrive Logistics Ltd — VAT: GB375949535
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
