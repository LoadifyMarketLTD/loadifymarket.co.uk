/**
 * MobileSellWizard — /sell
 *
 * Single-screen fast-list form for mobile. Goal: list an item in under 15 seconds.
 * Draft state is durable and user-scoped so camera/gallery switches, route remounts,
 * WebView reloads and process recreation do not erase seller input.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Images,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { trackStartListing, trackPublishListing } from '@/lib/analytics';
import {
  deleteProductImage,
  deleteProductImages,
  getProductImageErrorMessage,
  type ProductImageAsset,
  uploadProductImageBatch,
} from '@/lib/productImageStorage';
import {
  clearSellerListingDraft,
  isSellerListingDraftEmpty,
  loadSellerListingDraft,
  saveSellerListingDraft,
  type SellerListingDraftPayload,
} from '@/lib/sellerListingDraft';
import CategorySelector from '@/components/CategorySelector';
import ShippingMethodSelector from '@/components/ShippingMethodSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 6;
const DRAFT_SAVE_DELAY_MS = 250;

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition' },
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

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

// ── Success sheet ──────────────────────────────────────────────────────────────

function SuccessSheet({
  productId,
  isLive,
  cleanupWarning,
  onSellAnother,
}: {
  productId: string;
  isLive: boolean;
  cleanupWarning: string | null;
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
        style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '24px' }}
      >
        <CheckCircle2 className="text-success" style={{ width: '44px', height: '44px' }} />
      </div>

      <h2
        className="text-foreground"
        style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', marginBottom: '10px' }}
      >
        {isLive ? 'Your item is live! 🎉' : 'Your listing was saved'}
      </h2>
      <p
        className="text-foreground/55"
        style={{ fontSize: '15px', textAlign: 'center', marginBottom: '24px', maxWidth: '320px' }}
      >
        {isLive
          ? 'Buyers can now find and purchase your listing.'
          : 'The listing was created, but it is not public yet. Open Products to review its status.'}
      </p>

      {cleanupWarning && (
        <p
          role="alert"
          className="text-primary bg-primary/[0.08]"
          style={{
            width: '100%',
            maxWidth: '360px',
            fontSize: '13px',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
          }}
        >
          {cleanupWarning}
        </p>
      )}

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLive && (
          <button
            onClick={() => navigate(`/product/${productId}`)}
            className="bg-primary"
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            View listing
          </button>
        )}

        <button
          onClick={() => navigate('/seller/products')}
          className="text-foreground bg-white/[0.06]"
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.10)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Products
        </button>

        <button
          onClick={onSellAnother}
          className="text-muted-foreground"
          style={{
            width: '100%',
            minHeight: '48px',
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

// ── Form state ─────────────────────────────────────────────────────────────────

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

interface CreatedListingState {
  id: string;
  isActive: boolean;
  cleanupWarning: string | null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MobileSellWizard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const persistRevisionRef = useRef(0);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoRemovingPath, setPhotoRemovingPath] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<CreatedListingState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ photos?: string; title?: string; price?: string; shipping?: string }>({});
  const [selectedShippingMethodIds, setSelectedShippingMethodIds] = useState<string[]>([]);
  const [dispatchTime, setDispatchTime] = useState('');
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [draftHydratedUserId, setDraftHydratedUserId] = useState<string | null>(null);
  const [draftPersistenceError, setDraftPersistenceError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);

  const draftPayload: SellerListingDraftPayload = {
    photos: form.photos,
    title: form.title,
    price: form.price,
    description: form.description,
    categoryId: form.categoryId,
    subcategoryId: form.subcategoryId,
    condition: form.condition,
    shippingMethodIds: selectedShippingMethodIds,
    dispatchTime,
    moreDetailsOpen,
  };
  const hasMeaningfulDraft = !isSellerListingDraftEmpty(draftPayload);

  const queueDraftClear = async (userId: string) => {
    ++persistRevisionRef.current;
    const operation = persistQueueRef.current
      .catch(() => undefined)
      .then(() => clearSellerListingDraft(userId));
    persistQueueRef.current = operation.catch(() => undefined);
    await operation;
  };

  // Hydrate the correct user's draft before autosave is allowed to write anything.
  useEffect(() => {
    let cancelled = false;
    const userId = user?.id ?? null;
    ++persistRevisionRef.current;
    setDraftHydratedUserId(null);
    setDraftPersistenceError(null);
    setForm(INITIAL_FORM);
    setSelectedShippingMethodIds([]);
    setDispatchTime('');
    setMoreDetailsOpen(false);
    setFieldErrors({});
    setPhotoError(null);
    setPublishError(null);

    if (!userId) return () => { cancelled = true; };

    void (async () => {
      try {
        const draft = await loadSellerListingDraft(userId);
        if (cancelled) return;
        if (draft) {
          setForm({
            photos: draft.photos,
            title: draft.title,
            price: draft.price,
            description: draft.description,
            categoryId: draft.categoryId,
            subcategoryId: draft.subcategoryId,
            condition: draft.condition,
          });
          setSelectedShippingMethodIds(draft.shippingMethodIds);
          setDispatchTime(draft.dispatchTime);
          setMoreDetailsOpen(draft.moreDetailsOpen);
        }
      } catch (error) {
        console.error('MobileSellWizard: failed to restore seller draft:', error);
        if (!cancelled) {
          setDraftPersistenceError('Draft recovery is temporarily unavailable. Keep this screen open until you publish.');
        }
      } finally {
        if (!cancelled) setDraftHydratedUserId(userId);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Debounced, serialized autosave. The hydration guard prevents the empty initial
  // React state from overwriting a persisted draft before restoration completes.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || draftHydratedUserId !== userId || createdListing) return;

    const revision = ++persistRevisionRef.current;
    const payload = draftPayload;
    const timer = window.setTimeout(() => {
      const operation = persistQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (revision !== persistRevisionRef.current) return;
          await saveSellerListingDraft(userId, payload);
        });

      persistQueueRef.current = operation
        .then(() => {
          if (revision === persistRevisionRef.current) setDraftPersistenceError(null);
        })
        .catch((error) => {
          console.error('MobileSellWizard: failed to persist seller draft:', error);
          if (revision === persistRevisionRef.current) {
            setDraftPersistenceError('Draft autosave failed. Keep this screen open and try again before leaving.');
          }
        });
    }, DRAFT_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    createdListing,
    dispatchTime,
    draftHydratedUserId,
    form,
    moreDetailsOpen,
    selectedShippingMethodIds,
    user?.id,
  ]);

  useEffect(() => {
    if (user?.id && draftHydratedUserId === user.id) trackStartListing();
  }, [draftHydratedUserId, user?.id]);

  // ── Photo handlers ────────────────────────────────────────────────────────

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

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!user?.id) {
      setPublishError('You must be signed in as a seller to publish a listing.');
      return;
    }

    const errs: typeof fieldErrors = {};
    if (form.photos.length === 0) errs.photos = 'Please add at least one photo.';
    if (!form.title.trim()) errs.title = 'Please enter a title.';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) errs.price = 'Please enter a valid price greater than £0.';
    if (selectedShippingMethodIds.length === 0) errs.shipping = 'Please select at least one shipping method.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        price,
        condition: form.condition || undefined,
        images: form.photos.map((photo) => photo.url),
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
        listingContext: 'product',
        stockQuantity: 1,
        stockStatus: 'low_stock',
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

      const created = await res.json() as { id: string; isActive: boolean };
      let cleanupWarning: string | null = null;
      try {
        await queueDraftClear(user.id);
      } catch (error) {
        console.error('MobileSellWizard: listing created but draft cleanup failed:', error);
        cleanupWarning = 'Your listing was created, but local draft cleanup could not be confirmed. Do not publish this same draft again.';
      }

      if (created.isActive) trackPublishListing(created.id, form.title.trim());
      setCreatedListing({ id: created.id, isActive: created.isActive, cleanupWarning });
    } catch (err) {
      setPublishError((err as { message?: string }).message ?? 'Something went wrong. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  // ── Draft reset/discard ───────────────────────────────────────────────────

  const resetFormState = () => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSelectedShippingMethodIds([]);
    setDispatchTime('');
    setPublishError(null);
    setPhotoError(null);
    setMoreDetailsOpen(false);
  };

  const handleDiscardDraft = async () => {
    if (!user?.id) return;
    const imagePaths = form.photos.map((photo) => photo.path);
    setDiscardingDraft(true);
    setDraftPersistenceError(null);
    try {
      await queueDraftClear(user.id);
      resetFormState();
      setDiscardConfirmOpen(false);

      // Draft is already cleared. Storage cleanup is best-effort and can only leave
      // an orphan; it cannot break a live listing because this draft was never published.
      void deleteProductImages(imagePaths).then((failedPaths) => {
        if (failedPaths.length > 0) {
          console.error('MobileSellWizard: discarded draft left orphaned image paths:', failedPaths);
        }
      });
    } catch (error) {
      console.error('MobileSellWizard: failed to discard seller draft:', error);
      setDraftPersistenceError('Could not discard the saved draft. Your listing details were kept so you can try again.');
    } finally {
      setDiscardingDraft(false);
    }
  };

  const handleSellAnother = () => {
    resetFormState();
    setCreatedListing(null);
  };

  // ── Hydration/success screens ─────────────────────────────────────────────

  if (user?.id && draftHydratedUserId !== user.id) {
    return (
      <div
        className="bg-background text-foreground flex items-center justify-center"
        style={{ minHeight: '100dvh', padding: '24px' }}
      >
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <Loader2 className="text-primary" style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Restoring your draft…</span>
        </div>
      </div>
    );
  }

  if (createdListing) {
    return (
      <SuccessSheet
        productId={createdListing.id}
        isLive={createdListing.isActive}
        cleanupWarning={createdListing.cleanupWarning}
        onSellAnother={handleSellAnother}
      />
    );
  }

  const busy = publishing || photoUploading || photoRemovingPath !== null || discardingDraft;

  return (
    <div className="bg-background" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
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
            width: '44px',
            height: '44px',
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
        {hasMeaningfulDraft && (
          <button
            type="button"
            onClick={() => setDiscardConfirmOpen(true)}
            disabled={busy}
            className="text-danger bg-transparent border-none"
            style={{ minHeight: '44px', padding: '0 8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Discard
          </button>
        )}
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
        {draftPersistenceError && (
          <p
            role="alert"
            className="text-primary bg-primary/[0.08]"
            style={{
              fontSize: '13px',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: '12px',
              padding: '10px 14px',
              margin: 0,
            }}
          >
            {draftPersistenceError}
          </p>
        )}

        {/* Photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>
            Photos <span className="text-primary">*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            {form.photos.map((photo, idx) => (
              <div
                key={photo.path}
                style={{ position: 'relative', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden' }}
                className="bg-surface"
              >
                <img src={photo.url} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  className="absolute top-0 right-0 w-11 h-11 border-none flex items-center justify-center cursor-pointer bg-transparent"
                  aria-label={`Remove photo ${idx + 1}`}
                  onClick={() => void handleRemovePhoto(idx)}
                  disabled={busy}
                >
                  <span className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                    {photoRemovingPath === photo.path ? (
                      <Loader2 className="text-foreground" style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <X className="text-foreground" style={{ width: '14px', height: '14px' }} />
                    )}
                  </span>
                </button>
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <>
                <button
                  type="button"
                  aria-label="Take photo"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={busy}
                  style={{
                    aspectRatio: '1',
                    minWidth: 0,
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
                    <Loader2 style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
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
                  type="button"
                  aria-label="Choose photos from gallery"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={busy}
                  style={{
                    aspectRatio: '1',
                    minWidth: 0,
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

          {fieldErrors.photos && <p className="text-danger" style={{ fontSize: '12px', margin: 0 }}>{fieldErrors.photos}</p>}
          {photoError && (
            <p
              className="text-danger bg-danger/[0.08]"
              style={{ fontSize: '13px', border: '1px solid rgba(248,113,113,0.20)', borderRadius: '10px', padding: '10px 14px', margin: 0 }}
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
          {fieldErrors.shipping && <p className="text-danger" style={{ fontSize: '12px', margin: 0 }}>{fieldErrors.shipping}</p>}
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

        {/* ── More details (collapsible) ── */}
        <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setMoreDetailsOpen((o) => !o)}
            className="text-foreground bg-white/[0.03]"
            style={{
              width: '100%',
              minHeight: '48px',
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
            <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FieldInput
                label="Description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Add a short description (optional)"
                multiline
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>Category</label>
                <CategorySelector
                  selectedCategoryId={form.categoryId}
                  selectedSubcategoryId={form.subcategoryId}
                  onCategoryChange={(v) => setForm((p) => ({ ...p, categoryId: v, subcategoryId: '' }))}
                  onSubcategoryChange={(v) => setForm((p) => ({ ...p, subcategoryId: v }))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-foreground/75" style={{ fontSize: '13px', fontWeight: 600 }}>Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                  className={`bg-surface ${form.condition ? 'text-foreground' : 'text-foreground/40'}`}
                  style={{
                    width: '100%',
                    minHeight: '48px',
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
                    <option key={opt.value} value={opt.value} className="bg-surface text-foreground">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky CTA ── */}
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
          <p className="text-danger" style={{ fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>{publishError}</p>
        )}
        <button
          type="button"
          className={`text-base font-bold text-black flex items-center justify-center gap-2 w-full min-h-12 py-4 rounded-2xl border-none transition-colors ${busy ? 'bg-primary/40 cursor-not-allowed' : 'bg-primary cursor-pointer hover:bg-primary-hover'}`}
          onClick={handlePublish}
          disabled={busy}
        >
          {publishing ? (
            <>
              <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
              Publishing…
            </>
          ) : 'List item'}
        </button>
      </div>

      <Dialog open={discardConfirmOpen} onOpenChange={(open) => { if (!discardingDraft) setDiscardConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this draft?</DialogTitle>
            <DialogDescription>
              Your saved listing details will be cleared from this device. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setDiscardConfirmOpen(false)}
              disabled={discardingDraft}
              className="min-h-11 rounded-lg border border-white/10 bg-transparent px-4 text-sm font-semibold text-foreground"
            >
              Keep draft
            </button>
            <button
              type="button"
              onClick={() => void handleDiscardDraft()}
              disabled={discardingDraft}
              className="min-h-11 rounded-lg border-none bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {discardingDraft ? 'Discarding…' : 'Discard draft'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
