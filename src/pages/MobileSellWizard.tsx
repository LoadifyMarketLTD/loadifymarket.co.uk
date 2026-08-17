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
 * Defaults: listingContext=product, stockQuantity=1, seller-selected shipping methods.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Images,
  X,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { trackStartListing, trackPublishListing } from '@/lib/analytics';
import {
  deleteProductImage,
  getProductImageErrorMessage,
  type ProductImageAsset,
  uploadProductImageBatch,
} from '@/lib/productImageStorage';
import CategorySelector from '@/components/CategorySelector';
import ShippingMethodSelector from '@/components/ShippingMethodSelector';

const MAX_PHOTOS = 6;

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition' },
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

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
    border: `1px solid ${error ? 'hsl(var(--danger))' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: '14px',
    fontSize: '15px',
    padding: '14px 16px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
    boxSizing: 'border-box',
  };
  const inputClass = 'text-foreground bg-surface';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
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
          className={inputClass}
          style={baseStyle}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          style={baseStyle}
        />
      )}
      {error && <p className="text-danger" style={{ fontSize: '12px', margin: 0 }}>{error}</p>}
      {hint && !error && (
        <p className="text-foreground/40" style={{ fontSize: '12px', margin: 0 }}>{hint}</p>
      )}
    </div>
  );
}

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
      className="bg-background"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className="bg-success/[0.15] flex items-center justify-center"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          marginBottom: '24px',
        }}
      >
        <CheckCircle2 className="text-success" style={{ width: '44px', height: '44px' }} />
      </div>

      <h2
        className="text-foreground"
        style={{
          fontSize: '26px',
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: '10px',
        }}
      >
        Your item is live! 🎉
      </h2>
      <p
        className="text-foreground/55"
        style={{
          fontSize: '15px',
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
          className="bg-primary"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
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
          className="text-foreground bg-white/[0.06]"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: '15px',
            fontWeight: 600,
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
          className="text-muted-foreground"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sell another item
        </button>
      </div>
    </div>
  );
}

interface FormState {
  photos: ProductImageAsset[];
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

export default function MobileSellWizard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemovingPath, setPhotoRemovingPath] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ photos?: string; title?: string; price?: string; shipping?: string }>({});
  const [selectedShippingMethodIds, setSelectedShippingMethodIds] = useState<string[]>([]);
  const [dispatchTime, setDispatchTime] = useState('');
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);

  const startTrackedRef = useRef(false);
  if (!startTrackedRef.current) {
    startTrackedRef.current = true;
    trackStartListing();
  }

  const handleAddPhotos = async (files: FileList) => {
    if (!user?.id) {
      setPhotoError('You must be signed in as a seller to upload photos.');
      return;
    }

    const remaining = MAX_PHOTOS - form.photos.length;
    if (remaining <= 0) return;

    const batch = Array.from(files).slice(0, remaining);
    if (batch.length === 0) return;

    setPhotoUploading(true);
    setPhotoError(null);
    if (fieldErrors.photos) setFieldErrors((e) => ({ ...e, photos: undefined }));

    try {
      const uploaded = await uploadProductImageBatch(batch, user.id);
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploaded].slice(0, MAX_PHOTOS),
      }));
    } catch (error) {
      setPhotoError(getProductImageErrorMessage(error));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async (idx: number) => {
    const photo = form.photos[idx];
    if (!photo) return;

    setPhotoRemovingPath(photo.path);
    setPhotoError(null);

    try {
      await deleteProductImage(photo.path);
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((item) => item.path !== photo.path),
      }));
    } catch (error) {
      setPhotoError(getProductImageErrorMessage(error));
    } finally {
      setPhotoRemovingPath(null);
    }
  };

  const handlePublish = async () => {
    const errs: typeof fieldErrors = {};
    if (form.photos.length === 0) errs.photos = 'Please add at least one photo.';
    if (!form.title.trim()) errs.title = 'Please enter a title.';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0)
      errs.price = 'Please enter a valid price greater than £0.';
    if (selectedShippingMethodIds.length === 0)
      errs.shipping = 'Please select at least one shipping method.';
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
        images: form.photos.map((photo) => photo.url),
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
        specifications: Object.keys(specs).length > 0 ? specs : undefined,
        listingContext: 'product',
        stockQuantity: 1,
        stockStatus: 'in_stock',
        isActive: true,
        shippingMethodIds: selectedShippingMethodIds,
        dispatchTime: dispatchTime || null,
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

  const handleSellAnother = () => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSelectedShippingMethodIds([]);
    setDispatchTime('');
    setPublishedId(null);
    setPublishError(null);
    setPhotoError(null);
    setMoreDetailsOpen(false);
  };

  if (publishedId) {
    return <SuccessSheet productId={publishedId} onSellAnother={handleSellAnother} />;
  }

  const busy = publishing || photoUploading || photoRemovingPath !== null;

  return (
    <div className="bg-background" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
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
        className="bg-background/[0.97]"
      >
        <button
          aria-label="Go back"
          onClick={() => navigate(-1)}
          disabled={busy}
          className="bg-white/[0.07] flex items-center justify-center"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft className="text-foreground" style={{ width: '18px', height: '18px' }} />
        </button>
        <h1 className="text-foreground" style={{ fontSize: '17px', fontWeight: 700, flex: 1 }}>
          Sell an item
        </h1>
      </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
            Photos <span className="text-primary">*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {form.photos.map((photo, idx) => (
              <div
                key={photo.path}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
                className="bg-surface"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border-none flex items-center justify-center cursor-pointer"
                  aria-label={`Remove photo ${idx + 1}`}
                  onClick={() => void handleRemovePhoto(idx)}
                  disabled={busy}
                >
                  {photoRemovingPath === photo.path ? (
                    <Loader2
                      className="text-foreground"
                      style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }}
                    />
                  ) : (
                    <X className="text-foreground" style={{ width: '14px', height: '14px' }} />
                  )}
                </button>
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <>
                <button
                  aria-label="Take photo"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={busy}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '14px',
                    border: `2px dashed ${fieldErrors.photos ? 'hsl(var(--danger))' : 'rgba(212,175,55,0.35)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                  }}
                  className={fieldErrors.photos ? 'bg-danger/[0.04]' : 'bg-primary/[0.04]'}
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
                      <Camera className={fieldErrors.photos ? 'text-danger' : 'text-primary'} style={{ width: '24px', height: '24px' }} />
                      <span className={fieldErrors.photos ? 'text-danger' : 'text-primary'} style={{ fontSize: '11px', fontWeight: 600 }}>
                        Take photo
                      </span>
                    </>
                  )}
                </button>

                <button
                  aria-label="Choose photos from gallery"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={busy}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '14px',
                    border: `2px dashed ${fieldErrors.photos ? 'hsl(var(--danger))' : 'rgba(212,175,55,0.35)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                  }}
                  className={fieldErrors.photos ? 'bg-danger/[0.04]' : 'bg-primary/[0.04]'}
                >
                  <Images className={fieldErrors.photos ? 'text-danger' : 'text-primary'} style={{ width: '24px', height: '24px' }} />
                  <span className={fieldErrors.photos ? 'text-danger' : 'text-primary'} style={{ fontSize: '11px', fontWeight: 600 }}>
                    Gallery
                  </span>
                </button>
              </>
            )}
          </div>

          {fieldErrors.photos && (
            <p className="text-danger" style={{ fontSize: '12px', margin: 0 }}>{fieldErrors.photos}</p>
          )}
          {photoError && (
            <p
              className="text-danger bg-danger/[0.08]"
              style={{
                fontSize: '13px',
                border: '1px solid rgba(248,113,113,0.20)',
                borderRadius: '10px',
                padding: '10px 14px',
                margin: 0,
              }}
            >
              {photoError}
            </p>
          )}
          <p className="text-foreground/40" style={{ fontSize: '12px', margin: 0 }}>
            Take a new photo or choose JPG, PNG or WebP from your gallery. Up to 5MB per photo.
          </p>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void handleAddPhotos(e.target.files);
              e.target.value = '';
            }}
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void handleAddPhotos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
            Shipping method <span className="text-primary">*</span>
          </label>
          <ShippingMethodSelector
            selectedMethodIds={selectedShippingMethodIds}
            onChange={(ids) => {
              setSelectedShippingMethodIds(ids);
              if (fieldErrors.shipping) setFieldErrors((e) => ({ ...e, shipping: undefined }));
            }}
          />
          {fieldErrors.shipping && (
            <p className="text-danger" style={{ fontSize: '12px', margin: 0 }}>{fieldErrors.shipping}</p>
          )}
          {selectedShippingMethodIds.length > 0 && (
            <FieldInput
              label="Dispatch time"
              value={dispatchTime}
              onChange={setDispatchTime}
              placeholder="e.g. 1-2 working days"
              hint="Shown to buyers at checkout."
            />
          )}
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setMoreDetailsOpen((o) => !o)}
            className="text-foreground bg-white/[0.03]"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>More details</span>
            <ChevronDown
              className="text-foreground/50"
              style={{
                width: '18px',
                height: '18px',
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
              <FieldInput
                label="Description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Add a short description (optional)"
                multiline
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Category
                </label>
                <CategorySelector
                  selectedCategoryId={form.categoryId}
                  selectedSubcategoryId={form.subcategoryId}
                  onCategoryChange={(v) => setForm((p) => ({ ...p, categoryId: v, subcategoryId: '' }))}
                  onSubcategoryChange={(v) => setForm((p) => ({ ...p, subcategoryId: v }))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Condition
                </label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                  className={`bg-surface ${form.condition ? 'text-foreground' : 'text-foreground/40'}`}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    fontSize: '15px',
                    padding: '14px 16px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface text-foreground">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-background/[0.97]"
        style={{
          position: 'sticky',
          bottom: 0,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '16px 20px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0,
        }}
      >
        {publishError && (
          <p className="text-danger" style={{ fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>
            {publishError}
          </p>
        )}

        <button
          className={`text-base font-bold text-black flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-none transition-colors ${busy ? 'bg-primary/40 cursor-not-allowed' : 'bg-primary cursor-pointer hover:bg-primary-hover'}`}
          onClick={handlePublish}
          disabled={busy}
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
