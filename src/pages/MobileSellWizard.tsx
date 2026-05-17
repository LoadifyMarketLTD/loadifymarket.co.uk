/**
 * MobileSellWizard — /sell
 *
 * Single-screen fast-list form for mobile. Goal: list an item in under 15 seconds.
 *
 * Required fields: at least 1 photo, title, price.
 * Optional (collapsible "More details"): description, category, condition.
 *
 * Desktop product form (/seller/products/new) is untouched.
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
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { trackStartListing, trackPublishListing } from '@/lib/analytics';
import CategorySelector from '@/components/CategorySelector';

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'product-images';
const MAX_PHOTOS = 6;

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition' },
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

// ── Upload helper ──────────────────────────────────────────────────────────────

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

// ── Input primitive ────────────────────────────────────────────────────────────

function FieldInput({
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
  label?: string;
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
    background: 'rgba(23,24,30,1)',
    border: `1px solid ${error ? 'hsl(var(--danger))' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: '14px',
    color: 'rgba(255,255,255,1)',
    fontSize: '15px',
    padding: '14px 16px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
    boxSizing: 'border-box',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
          {label}
          {required && <span style={{ marginLeft: '3px' }}>*</span>}
        </label>
      )}
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
      {error && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,1)', margin: 0 }}>{error}</p>}
      {hint && !error && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>{hint}</p>
      )}
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
        background: 'rgba(10,14,26,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
      }}
    >
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
        <CheckCircle2 style={{ width: '44px', height: '44px', color: 'rgba(52,211,153,1)' }} />
      </div>

      <h2
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: 'rgba(255,255,255,1)',
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
            background: 'rgba(212,175,55,1)',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            
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
            color: 'rgba(255,255,255,1)',
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

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  photos: string[];
  title: string;
  price: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  condition: string;
}

const INITIAL_FORM: FormState = {
  photos: [],
  title: '',
  price: '',
  description: '',
  categoryId: '',
  subcategoryId: '',
  condition: '',
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function MobileSellWizard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ photos?: string; title?: string; price?: string }>({});
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);

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
    if (fieldErrors.photos) setFieldErrors((e) => ({ ...e, photos: undefined }));
    try {
      const remaining = MAX_PHOTOS - form.photos.length;
      const batch = Array.from(files).slice(0, remaining);
      const urls = await Promise.all(batch.map((f) => uploadPhoto(f, user.id)));
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls].slice(0, MAX_PHOTOS) }));
    } catch {
      setPhotoError('Photo upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const errs: typeof fieldErrors = {};
    if (form.photos.length === 0) errs.photos = 'Please add at least one photo.';
    if (!form.title.trim()) errs.title = 'Please enter a title.';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0)
      errs.price = 'Please enter a valid price greater than £0.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const specs: Record<string, string> = {};
      if (form.condition) specs.condition = form.condition;

      const payload = {
        title: form.title.trim(),
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

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleSellAnother = () => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setPublishedId(null);
    setPublishError(null);
    setMoreDetailsOpen(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (publishedId) {
    return <SuccessSheet productId={publishedId} onSellAnother={handleSellAnother} />;
  }

  const busy = publishing || photoUploading;

  return (
    <div style={{ minHeight: '100dvh', background: 'rgba(10,14,26,1)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
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
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          aria-label="Go back"
          onClick={() => navigate(-1)}
          disabled={busy}
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
          <ArrowLeft style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,1)' }} />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,1)', flex: 1 }}>
          Sell an item
        </h1>
      </div>

      {/* ── Scrollable form ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
            Photos <span className="text-primary">*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {form.photos.map((url, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'rgba(23,24,30,1)',
                }}
              >
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  aria-label={`Remove photo ${idx + 1}`}
                  onClick={() => handleRemovePhoto(idx)}
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
                  <X style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,1)' }} />
                </button>
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <button
                aria-label="Add photo"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                style={{
                  aspectRatio: '1',
                  borderRadius: '14px',
                  border: `2px dashed ${fieldErrors.photos ? 'hsl(var(--danger))' : 'rgba(212,175,55,0.35)'}`,
                  background: fieldErrors.photos ? 'rgba(248,113,113,0.04)' : 'rgba(212,175,55,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: photoUploading ? 'not-allowed' : 'pointer',
                  opacity: photoUploading ? 0.6 : 1,
                }}
              >
                {photoUploading ? (
                  <Loader2
                    style={{
                      width: '24px',
                      height: '24px',
                      
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                ) : (
                  <>
                    <Camera style={{ width: '24px', height: '24px', color: fieldErrors.photos ? 'rgba(248,113,113,1)' : 'rgba(212,175,55,1)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: fieldErrors.photos ? 'rgba(248,113,113,1)' : 'rgba(212,175,55,1)' }}>
                      Add photo
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {fieldErrors.photos && (
            <p style={{ fontSize: '12px', color: 'rgba(248,113,113,1)', margin: 0 }}>{fieldErrors.photos}</p>
          )}
          {photoError && (
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(248,113,113,1)',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.20)',
                borderRadius: '10px',
                padding: '10px 14px',
                margin: 0,
              }}
            >
              {photoError}
            </p>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleAddPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Title */}
        <FieldInput
          label="Title"
          value={form.title}
          onChange={(v) => {
            setForm((p) => ({ ...p, title: v }));
            if (fieldErrors.title) setFieldErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder="What are you selling?"
          required
          error={fieldErrors.title}
        />

        {/* Price */}
        <FieldInput
          label="Price (£)"
          value={form.price}
          onChange={(v) => {
            setForm((p) => ({ ...p, price: v }));
            if (fieldErrors.price) setFieldErrors((e) => ({ ...e, price: undefined }));
          }}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          required
          error={fieldErrors.price}
        />

        {/* ── More details (collapsible) ── */}
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setMoreDetailsOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,1)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>More details</span>
            <ChevronDown
              style={{
                width: '18px',
                height: '18px',
                color: 'rgba(255,255,255,0.50)',
                transform: moreDetailsOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {moreDetailsOpen && (
            <div
              style={{
                padding: '4px 16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Description */}
              <FieldInput
                label="Description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Add a short description (optional)"
                multiline
              />

              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                  Category
                </label>
                <CategorySelector
                  selectedCategoryId={form.categoryId}
                  selectedSubcategoryId={form.subcategoryId}
                  onCategoryChange={(v) => setForm((p) => ({ ...p, categoryId: v, subcategoryId: '' }))}
                  onSubcategoryChange={(v) => setForm((p) => ({ ...p, subcategoryId: v }))}
                />
              </div>

              {/* Condition */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                  Condition
                </label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'rgba(23,24,30,1)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    color: form.condition ? 'hsl(var(--foreground))' : 'rgba(255,255,255,0.40)',
                    fontSize: '15px',
                    padding: '14px 16px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: 'rgba(23,24,30,1)', color: 'rgba(255,255,255,1)' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky CTA ── */}
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
          <p style={{ fontSize: '13px', color: 'rgba(248,113,113,1)', marginBottom: '10px', textAlign: 'center' }}>
            {publishError}
          </p>
        )}

        <button
          onClick={handlePublish}
          disabled={busy}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background: busy
              ? 'rgba(212,175,55,0.40)'
              : 'hsl(var(--primary))',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
        >
          {publishing ? (
            <>
              <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
              Publishing…
            </>
          ) : (
            'List item'
          )}
        </button>
      </div>
    </div>
  );
}
