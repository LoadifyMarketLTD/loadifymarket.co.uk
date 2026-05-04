/**
 * MobileSellWizard — /sell
 *
 * A 4-step simplified sell flow for the mobile APK.
 * Desktop users who land here are silently redirected to the full
 * ProductFormPage at /seller/products/new.
 *
 * Steps:
 *   1. Add photos
 *   2. Title + price (+ optional description)
 *   3. Category + location (optional)
 *   4. Publish (review + submit)
 *
 * After a successful publish a full-screen success sheet is shown:
 *   "Your item is live!"  →  "View listing" | "Set up payments" | "Sell another"
 *
 * Backend: calls /.netlify/functions/create-product unchanged.
 * Defaults: listingContext=goods, stockQuantity=1, shippingMethodIds=[].
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { trackStartListing, trackPublishListing } from '@/lib/analytics';
import CategorySelector from '@/components/CategorySelector';

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'product-images';
const MAX_PHOTOS = 6;
const STEPS = ['Photos', 'Details', 'Category', 'Publish'] as const;
type Step = 0 | 1 | 2 | 3;

// ── Upload helper (inline — avoids importing desktop ImageUpload component) ────

async function uploadPhoto(file: File, userId: string): Promise<string> {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `sellers/${userId}/${ts}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── Shared UI primitives ───────────────────────────────────────────────────────

function WizardInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  required,
  error,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
  required?: boolean;
  error?: string;
  hint?: string;
  multiline?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    background: '#17181E',
    border: `1px solid ${error ? '#F87171' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: '14px',
    color: '#FFFFFF',
    fontSize: '15px',
    padding: '14px 16px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#F5B942', marginLeft: '3px' }}>*</span>
        )}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={baseStyle}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={baseStyle}
        />
      )}
      {error && (
        <p style={{ fontSize: '12px', color: '#F87171', margin: 0 }}>{error}</p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Step 1: Photos ─────────────────────────────────────────────────────────────

function StepPhotos({
  photos,
  uploading,
  uploadError,
  onAddPhotos,
  onRemovePhoto,
}: {
  photos: string[];
  uploading: boolean;
  uploadError: string | null;
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '6px',
          }}
        >
          Add photos
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
          Good photos sell faster. Add up to {MAX_PHOTOS}.
        </p>
      </div>

      {/* Photo grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {photos.map((url, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '14px',
              overflow: 'hidden',
              background: '#17181E',
            }}
          >
            <img
              src={url}
              alt={`Photo ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              aria-label={`Remove photo ${idx + 1}`}
              onClick={() => onRemovePhoto(idx)}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.70)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '14px', height: '14px', color: '#FFFFFF' }} />
            </button>
          </div>
        ))}

        {/* Add photo cell */}
        {photos.length < MAX_PHOTOS && (
          <button
            aria-label="Add photo"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              aspectRatio: '1',
              borderRadius: '14px',
              border: '2px dashed rgba(245,185,66,0.35)',
              background: 'rgba(245,185,66,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <Loader2
                style={{
                  width: '24px',
                  height: '24px',
                  color: '#F5B942',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : (
              <>
                <Camera
                  style={{ width: '24px', height: '24px', color: '#F5B942' }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#F5B942',
                  }}
                >
                  Add photo
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddPhotos(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {uploadError && (
        <p
          style={{
            fontSize: '13px',
            color: '#F87171',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.20)',
            borderRadius: '10px',
            padding: '10px 14px',
            margin: 0,
          }}
        >
          {uploadError}
        </p>
      )}

      {photos.length === 0 && !uploadError && (
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.35)',
            textAlign: 'center',
          }}
        >
          You can skip photos and add them later.
        </p>
      )}
    </div>
  );
}

// ── Step 2: Details ────────────────────────────────────────────────────────────

function StepDetails({
  title,
  price,
  description,
  onTitle,
  onPrice,
  onDescription,
  errors,
}: {
  title: string;
  price: string;
  description: string;
  onTitle: (v: string) => void;
  onPrice: (v: string) => void;
  onDescription: (v: string) => void;
  errors: { title?: string; price?: string };
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '6px',
          }}
        >
          Item details
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
          Give your item a clear title and set your price.
        </p>
      </div>

      <WizardInput
        label="Item title"
        value={title}
        onChange={onTitle}
        placeholder="e.g. Nike Air Max, iPhone 13, Vintage lamp…"
        required
        error={errors.title}
      />

      <WizardInput
        label="Price (£)"
        value={price}
        onChange={onPrice}
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        required
        error={errors.price}
        hint="Enter the price buyers will pay."
      />

      <WizardInput
        label="Description (optional)"
        value={description}
        onChange={onDescription}
        placeholder="Describe the condition, size, colour or any details buyers should know…"
        multiline
        hint="A good description helps buyers trust your item."
      />
    </div>
  );
}

// ── Step 3: Category + Location ────────────────────────────────────────────────

function StepCategoryLocation({
  categoryId,
  subcategoryId,
  location,
  onCategory,
  onSubcategory,
  onLocation,
}: {
  categoryId: string;
  subcategoryId: string;
  location: string;
  onCategory: (v: string) => void;
  onSubcategory: (v: string) => void;
  onLocation: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '6px',
          }}
        >
          Category &amp; location
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
          Help buyers find your item.
        </p>
      </div>

      <CategorySelector
        selectedCategoryId={categoryId}
        selectedSubcategoryId={subcategoryId}
        onCategoryChange={onCategory}
        onSubcategoryChange={onSubcategory}
      />

      <WizardInput
        label="Location (optional)"
        value={location}
        onChange={onLocation}
        placeholder="e.g. London, Manchester, Birmingham…"
        hint="City or area where the item is located."
      />
    </div>
  );
}

// ── Step 4: Review + Publish ───────────────────────────────────────────────────

function StepReview({
  photos,
  title,
  price,
  description,
  location,
}: {
  photos: string[];
  title: string;
  price: string;
  description: string;
  location: string;
}) {
  const displayPrice = parseFloat(price);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '6px',
          }}
        >
          Ready to publish?
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
          Check your listing before it goes live.
        </p>
      </div>

      {/* Preview card */}
      <div
        style={{
          background: '#12121A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          overflow: 'hidden',
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#17181E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {photos.length > 0 ? (
            <img
              src={photos[0]}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Camera
              style={{
                width: '40px',
                height: '40px',
                color: 'rgba(255,255,255,0.20)',
              }}
            />
          )}
        </div>

        <div style={{ padding: '16px' }}>
          <p
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '4px',
            }}
          >
            {title || '—'}
          </p>
          <p
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#F5B942',
              marginBottom: description ? '8px' : 0,
            }}
          >
            £{isNaN(displayPrice) ? '—' : displayPrice.toFixed(2)}
          </p>
          {description && (
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.55)',
                marginBottom: location ? '6px' : 0,
              }}
              className="line-clamp-2"
            >
              {description}
            </p>
          )}
          {location && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>
              📍 {location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Success sheet ──────────────────────────────────────────────────────────────

function SuccessSheet({
  productId,
  onSellAnother,
}: {
  productId: string;
  onSellAnother: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#07080B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Checkmark */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <CheckCircle2
          style={{ width: '44px', height: '44px', color: '#34D399' }}
        />
      </div>

      <h2
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#FFFFFF',
          textAlign: 'center',
          marginBottom: '10px',
        }}
      >
        Your item is live! 🎉
      </h2>
      <p
        style={{
          fontSize: '15px',
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          marginBottom: '36px',
          maxWidth: '300px',
        }}
      >
        Buyers can now find and purchase your listing.
      </p>

      {/* Actions */}
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate(`/product/${productId}`)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #F5C842, #C8860A)',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            color: '#0B0B0F',
            cursor: 'pointer',
          }}
        >
          View listing
        </button>

        <button
          onClick={() => navigate('/seller/setup')}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: '15px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          Set up payments
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        </button>

        <button
          onClick={onSellAnother}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
          }}
        >
          Sell another item
        </button>
      </div>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────────

interface FormState {
  photos: string[];
  title: string;
  price: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  location: string;
}

const INITIAL_FORM: FormState = {
  photos: [],
  title: '',
  price: '',
  description: '',
  categoryId: '',
  subcategoryId: '',
  location: '',
};

export default function MobileSellWizard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; price?: string }>({});

  // Track listing start once
  const startTrackedRef = useRef(false);
  if (!startTrackedRef.current) {
    startTrackedRef.current = true;
    trackStartListing();
  }

  // ── Photo handlers ────────────────────────────────────────────────────────

  const handleAddPhotos = async (files: FileList) => {
    if (!user?.id) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const remaining = MAX_PHOTOS - form.photos.length;
      const batch = Array.from(files).slice(0, remaining);
      const urls = await Promise.all(batch.map((f) => uploadPhoto(f, user.id)));
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...urls].slice(0, MAX_PHOTOS),
      }));
    } catch {
      setPhotoError('Photo upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    const errs: { title?: string; price?: string } = {};
    if (!form.title.trim()) errs.title = 'Please enter a title.';
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0)
      errs.price = 'Please enter a valid price greater than £0.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  };

  const handleBack = () => {
    if (step === 0) {
      navigate(-1);
    } else {
      setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev));
    }
  };

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    // Re-validate step 1 fields in case user navigated here directly
    if (!form.title.trim()) {
      setStep(1);
      setFieldErrors({ title: 'Please enter a title.' });
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      setStep(1);
      setFieldErrors({ price: 'Please enter a valid price.' });
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const specs: Record<string, string> = {};
      if (form.location.trim()) specs.location = form.location.trim();

      const payload = {
        title: form.title.trim(),
        // description is optional in the backend (only title + price are required).
        // We fall back to the title so the product row always has a non-empty
        // description, which keeps listing-detail pages and search results readable.
        description: form.description.trim() || form.title.trim(),
        price,
        images: form.photos,
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
        specifications: Object.keys(specs).length > 0 ? specs : undefined,
        listingContext: 'goods',
        stockQuantity: 1,
        stockStatus: 'in_stock',
        isActive: true,
        shippingMethodIds: [],
        dispatchTime: null,
      };

      const res = await authorizedFetch('/.netlify/functions/create-product', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      const created = await res.json() as { id: string };
      trackPublishListing(created.id, form.title.trim());
      setPublishedId(created.id);
    } catch (err) {
      setPublishError(
        (err as { message?: string }).message ?? 'Something went wrong. Please try again.',
      );
    } finally {
      setPublishing(false);
    }
  };

  // ── Reset for "sell another" ───────────────────────────────────────────────

  const handleSellAnother = () => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setPublishedId(null);
    setPublishError(null);
    setStep(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Show success sheet after publish
  if (publishedId) {
    return <SuccessSheet productId={publishedId} onSellAnother={handleSellAnother} />;
  }

  const isLastStep = step === 3;
  const continueLabel =
    step === 0 ? (form.photos.length > 0 ? 'Continue' : 'Skip photos') :
    step === 1 ? 'Continue' :
    step === 2 ? 'Review listing' :
    'Publish now';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#07080B',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Sticky header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(7,8,11,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 'calc(0.875rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.875rem',
          paddingLeft: '16px',
          paddingRight: '16px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <button
            aria-label="Go back"
            onClick={handleBack}
            disabled={publishing}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft
              style={{ width: '18px', height: '18px', color: '#FFFFFF' }}
            />
          </button>
          <h1
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#FFFFFF',
              flex: 1,
            }}
          >
            Sell an item
          </h1>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.40)',
              flexShrink: 0,
            }}
          >
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: '3px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #F5C842, #C8860A)',
              width: `${((step + 1) / STEPS.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {step === 0 && (
          <StepPhotos
            photos={form.photos}
            uploading={photoUploading}
            uploadError={photoError}
            onAddPhotos={handleAddPhotos}
            onRemovePhoto={handleRemovePhoto}
          />
        )}
        {step === 1 && (
          <StepDetails
            title={form.title}
            price={form.price}
            description={form.description}
            onTitle={(v) => {
              setForm((p) => ({ ...p, title: v }));
              if (fieldErrors.title) setFieldErrors((e) => ({ ...e, title: undefined }));
            }}
            onPrice={(v) => {
              setForm((p) => ({ ...p, price: v }));
              if (fieldErrors.price) setFieldErrors((e) => ({ ...e, price: undefined }));
            }}
            onDescription={(v) => setForm((p) => ({ ...p, description: v }))}
            errors={fieldErrors}
          />
        )}
        {step === 2 && (
          <StepCategoryLocation
            categoryId={form.categoryId}
            subcategoryId={form.subcategoryId}
            location={form.location}
            onCategory={(v) => setForm((p) => ({ ...p, categoryId: v, subcategoryId: '' }))}
            onSubcategory={(v) => setForm((p) => ({ ...p, subcategoryId: v }))}
            onLocation={(v) => setForm((p) => ({ ...p, location: v }))}
          />
        )}
        {step === 3 && (
          <StepReview
            photos={form.photos}
            title={form.title}
            price={form.price}
            description={form.description}
            location={form.location}
          />
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'rgba(7,8,11,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '16px 20px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0,
        }}
      >
        {publishError && (
          <p
            style={{
              fontSize: '13px',
              color: '#F87171',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            {publishError}
          </p>
        )}

        <button
          onClick={isLastStep ? handlePublish : handleNext}
          disabled={publishing || photoUploading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background:
              publishing || photoUploading
                ? 'rgba(245,185,66,0.40)'
                : 'linear-gradient(135deg, #F5C842, #C8860A)',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            color: '#0B0B0F',
            cursor: publishing || photoUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
        >
          {publishing ? (
            <>
              <Loader2
                style={{
                  width: '18px',
                  height: '18px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Publishing…
            </>
          ) : (
            continueLabel
          )}
        </button>
      </div>
    </div>
  );
}
