import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasSellerAccess } from '../lib/roleUtils';
import type { ProductType, ProductCondition } from '../types';
import CategorySelector from '../components/CategorySelector';
import ImageUpload from '../components/ImageUpload';
import ShippingMethodSelector from '../components/ShippingMethodSelector';
import { toast } from '../hooks/use-toast';
import { copyToClipboard } from '../lib/clipboard';
import { trackPublishListing, trackStartListing, trackShareProduct, trackCopyLink } from '../lib/analytics';
import { authorizedFetch } from '../lib/authorizedFetch';

// Listing types that require bulk/pallet-specific fields
const BULK_PRODUCT_TYPES: ProductType[] = ['pallet', 'lot', 'wholesale'];
// Delay in ms before navigating away after a successful save
const SUCCESS_REDIRECT_DELAY_MS = 1800;

// Normalise a decimal number string entered by the user.
//
// Handles both decimal-separator and thousands-separator ambiguity:
//   "39,99"       → "39.99"  (European decimal comma)
//   "13.150"      → "13150"  (European/ISO thousands period before 3 digits)
//   "1,000.50"    → "1000.50" (UK/US thousands comma + decimal period)
//   "1.000,50"    → "1000.50" (European thousands period + decimal comma)
//   "1.000.000"   → "1000000" (multiple thousands periods)
//   "1,000"       → "1000"   (thousands comma, no decimal part)
//   "1.99"        → "1.99"   (regular decimal period — 2 digits, not 3)
const normalizeDecimal = (value: string): string => {
  const v = value.trim();
  if (!v) return v;
  const periodCount = (v.match(/\./g) ?? []).length;
  const commaCount  = (v.match(/,/g)  ?? []).length;

  if (periodCount > 0 && commaCount > 0) {
    // Both separators present: the one that appears last is the decimal separator.
    if (v.lastIndexOf(',') > v.lastIndexOf('.')) {
      // European format: 1.000,50 → strip periods (thousands), replace comma with period
      return v.replace(/\./g, '').replace(',', '.');
    } else {
      // UK/US format: 1,000.50 → strip commas (thousands), keep period
      return v.replace(/,/g, '');
    }
  }

  if (commaCount > 0) {
    // Comma only: thousands separator if it matches \d{1,3}(,\d{3})+ pattern,
    // otherwise treat as a decimal separator.
    if (/^\d{1,3}(,\d{3})+$/.test(v)) return v.replace(/,/g, '');
    return v.replace(',', '.');
  }

  if (periodCount > 1) {
    // Multiple periods: all are thousands separators (e.g. 1.000.000 → 1000000)
    return v.replace(/\./g, '');
  }

  if (periodCount === 1) {
    // Single period: thousands separator when exactly 3 digits follow and no decimal
    // digits after that (e.g. 13.150 → 13150). Otherwise it is a decimal point.
    if (/^\d+\.\d{3}$/.test(v)) return v.replace('.', '');
    return v;
  }

  return v;
};

interface CustomSpec {
  key: string;
  value: string;
}

type FormErrors = Partial<Record<string, string>>;

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-white/10 rounded-xl p-6 mb-6 shadow-lg shadow-black/20 ${className}`}>
      <h2 className="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{title}</h2>
      {children}
    </div>
  );
}

// ─── Field error display ──────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-danger flex items-center gap-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishedProductId, setPublishedProductId] = useState<string | null>(null);
  const [selectedShippingMethodIds, setSelectedShippingMethodIds] = useState<string[]>([]);
  const [dispatchTime, setDispatchTime] = useState('');
  // True when the product has active or completed orders — critical fields are locked for sellers
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>([]);

  // 'service' = no stock/shipping; 'goods' = physical product with stock + shipping
  const [listingContext, setListingContext] = useState<'service' | 'goods'>('service');

  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    type: 'product' as ProductType,
    condition: 'new' as ProductCondition,
    price: '',
    salePrice: '',
    stockQuantity: '',
    categoryId: '',
    subcategoryId: '',
    images: [] as string[],
    specifications: {} as Record<string, string>,
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    palletInfo: {
      palletCount: '',
      itemsPerPallet: '',
      palletType: '',
    },
    moq: '',                  // Wholesale / pallet: minimum order quantity
    lotQuantity: '',          // Bulk/lot: number of items in the lot
    brand: '',
    model: '',
    sku: '',
    estimatedRetailValue: '', // Estimated RRP for bulk/pallet
    manifestNotes: '',        // Stock manifest notes for bulk/pallet/clearance
    shippingNotes: '',
    collectionAvailable: false,
    deliveryAvailable: true,
  });

  const fetchProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Ownership check — only the seller who created the product (or admin/owner) may edit it.
      if (data.sellerId !== user?.id && user?.role !== 'admin') {
        toast({ title: 'Access denied', description: 'You do not have permission to edit this product.', variant: 'destructive' });
        navigate('/seller');
        return;
      }

      if (data) {
        // Restore listing context from the saved product
        if (data.listingContext === 'goods' || data.listingContext === 'service') {
          setListingContext(data.listingContext);
        }
        const specs = data.specifications || {};
        setFormData({
          title: data.title || '',
          shortDescription: specs.shortDescription || '',
          description: data.description || '',
          type: data.type || 'product',
          condition: data.condition || 'new',
          price: data.price?.toString() || '',
          salePrice: specs.salePrice || '',
          stockQuantity: data.stockQuantity?.toString() || '',
          categoryId: data.categoryId || '',
          subcategoryId: data.subcategoryId || '',
          images: data.images || [],
          specifications: specs,
          weight: data.weight?.toString() || '',
          dimensions: data.dimensions || { length: '', width: '', height: '' },
          palletInfo: data.palletInfo || { palletCount: '', itemsPerPallet: '', palletType: '' },
          moq: specs.moq || '',
          lotQuantity: specs.lotQuantity || '',
          brand: specs.brand || '',
          model: specs.model || '',
          sku: specs.sku || '',
          estimatedRetailValue: specs.estimatedRetailValue || '',
          manifestNotes: specs.manifestNotes || '',
          shippingNotes: specs.shippingNotes || '',
          collectionAvailable: specs.collectionAvailable === 'true',
          // deliveryAvailable defaults to true for new products (not yet saved); explicit 'false' disables it
          deliveryAvailable: specs.deliveryAvailable !== 'false',
        });

        // Restore custom key-value specs — strip out known structured keys
        const knownKeys = new Set([
          'shortDescription', 'salePrice', 'moq', 'lotQuantity', 'brand', 'model', 'sku',
          'estimatedRetailValue', 'manifestNotes', 'shippingNotes', 'collectionAvailable', 'deliveryAvailable',
        ]);
        const customEntries = Object.entries(specs)
          .filter(([k]) => !knownKeys.has(k))
          .map(([key, value]) => ({ key, value: String(value) }));
        if (customEntries.length > 0) {
          setCustomSpecs(customEntries);
        }

        // Load the shipping methods already linked to this product
        const { data: psData } = await supabase
          .from('product_shipping')
          .select('method_id, dispatch_time')
          .eq('product_id', id);
        if (psData) {
          setSelectedShippingMethodIds(psData.map((r: { method_id: string }) => r.method_id));
          // Use the first row's dispatch_time as the shared dispatch time
          if (psData.length > 0 && psData[0].dispatch_time) {
            setDispatchTime(psData[0].dispatch_time);
          }
        }

        // Check for active or completed orders — sellers cannot edit critical fields once ordered.
        // Only paid/in-progress orders count; 'pending' (unpaid/abandoned checkouts) does not lock the product.
        // Admins/owners bypass this restriction.
        if (data.sellerId === user?.id) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('productId', id)
            .in('status', ['paid', 'packed', 'shipped', 'delivered']);
          setHasActiveOrders((count ?? 0) > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({ title: 'Failed to load product', description: 'Could not load the product details. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    } else {
      // New listing — track start_listing event
      trackStartListing();
    }
  }, [id, fetchProduct]);

  // ─── Validate ──────────────────────────────────────────────────────────────
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!formData.title.trim()) e.title = 'Product title is required.';
    if (!formData.description.trim()) e.description = 'Description is required.';
    if (!formData.categoryId) e.categoryId = 'Please select a category.';
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      e.price = 'Please enter a valid price greater than 0.';
    }
    if (formData.salePrice && (isNaN(parseFloat(formData.salePrice)) || parseFloat(formData.salePrice) <= 0)) {
      e.salePrice = 'Sale price must be a positive number.';
    }
    if (formData.salePrice && formData.price && parseFloat(formData.salePrice) >= parseFloat(formData.price)) {
      e.salePrice = 'Sale price must be less than the regular price.';
    }
    // Stock quantity only required for physical goods
    if (listingContext === 'goods') {
      if (!formData.stockQuantity || isNaN(parseInt(formData.stockQuantity)) || parseInt(formData.stockQuantity) < 0) {
        e.stockQuantity = 'Please enter a valid stock quantity (0 or more).';
      }
    }
    return e;
  };

  // ─── Build specs JSONB from form fields ────────────────────────────────────
  const buildSpecs = (): Record<string, string> => {
    const specs: Record<string, string> = {};
    if (formData.shortDescription) specs.shortDescription = formData.shortDescription;
    if (formData.salePrice) specs.salePrice = formData.salePrice;
    if (formData.brand) specs.brand = formData.brand;
    if (formData.model) specs.model = formData.model;
    if (formData.sku) specs.sku = formData.sku;
    if (formData.shippingNotes) specs.shippingNotes = formData.shippingNotes;
    // Shipping/logistics flags — stored as strings because the specifications field
    // is typed as Record<string, string> (JSONB stored as text values)
    specs.collectionAvailable = formData.collectionAvailable ? 'true' : 'false';
    specs.deliveryAvailable = formData.deliveryAvailable ? 'true' : 'false';

    // Bulk-type fields
    if (formData.type === 'wholesale' || formData.type === 'pallet') {
      if (formData.moq) specs.moq = formData.moq;
    }
    if (formData.type === 'lot' || formData.type === 'wholesale') {
      if (formData.lotQuantity) specs.lotQuantity = formData.lotQuantity;
    }
    if (BULK_PRODUCT_TYPES.includes(formData.type)) {
      if (formData.estimatedRetailValue) specs.estimatedRetailValue = formData.estimatedRetailValue;
      if (formData.manifestNotes) specs.manifestNotes = formData.manifestNotes;
    }
    // Custom key-value specs
    for (const { key, value } of customSpecs) {
      if (key.trim() && value.trim()) specs[key.trim()] = value.trim();
    }
    return specs;
  };

  // ─── Core save function ────────────────────────────────────────────────────
  const saveProduct = async (publishMode: boolean) => {
    if (!user) return;
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});

    if (publishMode) setSaving(true); else setSavingDraft(true);
    try {
      const price = parseFloat(formData.price);

      // When critical fields are locked (orders exist) and the user is a seller,
      // only allow non-critical fields to be updated.
      const isAdmin = user.role === 'admin';
      const specs = buildSpecs();

      // Build the product payload (isApproved is now set server-side via create-product / update-product)
      const productData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        condition: formData.condition,
        price,
        stockQuantity: listingContext === 'service' ? 0 : parseInt(formData.stockQuantity),
        stockStatus: listingContext === 'service' ? 'in_stock' :
                    (parseInt(formData.stockQuantity) > 10 ? 'in_stock' :
                    parseInt(formData.stockQuantity) > 0 ? 'low_stock' : 'out_of_stock'),
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null,
        images: formData.images,
        specifications: specs,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: (formData.dimensions.length && formData.dimensions.width && formData.dimensions.height)
          ? formData.dimensions
          : null,
        palletInfo: (formData.type === 'pallet' && formData.palletInfo.palletCount)
          ? formData.palletInfo
          : null,
        isActive: publishMode,
      };

      if (id && hasActiveOrders && !isAdmin) {
        // Locked product — only allow non-critical fields via update-product
        const { description, images, specifications, weight, dimensions, palletInfo } = productData;
        const res = await authorizedFetch('/.netlify/functions/update-product', {
          method: 'POST',
          body: JSON.stringify({
            id,
            description,
            images,
            specifications,
            weight,
            dimensions,
            palletInfo,
            shippingMethodIds: selectedShippingMethodIds,
            dispatchTime: dispatchTime || null,
            lockedFieldsOnly: true,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error((payload as { error?: string }).error ?? `Server returned ${res.status}`);
        }
        setSuccessMessage('Product updated. Critical fields were not changed as orders exist.');
      } else if (id) {
        // Full update via update-product
        const res = await authorizedFetch('/.netlify/functions/update-product', {
          method: 'POST',
          body: JSON.stringify({
            id,
            ...productData,
            shippingMethodIds: selectedShippingMethodIds,
            dispatchTime: dispatchTime || null,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error((payload as { error?: string }).error ?? `Server returned ${res.status}`);
        }
        setSuccessMessage(publishMode ? 'Product updated and published.' : 'Draft saved successfully.');
      } else {
        // Create new product via create-product (backend sets isApproved)
        const res = await authorizedFetch('/.netlify/functions/create-product', {
          method: 'POST',
          body: JSON.stringify({
            ...productData,
            listingContext,
            shippingMethodIds: listingContext === 'goods' ? selectedShippingMethodIds : [],
            dispatchTime: listingContext === 'goods' ? (dispatchTime || null) : null,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error((payload as { error?: string }).error ?? `Server returned ${res.status}`);
        }
        const created = await res.json() as { id: string; isApproved: boolean };

        // Mark first product created for onboarding completion tracking.
        // Non-fatal: onboarding checklist will still derive this from product count.
        // Fetch all onboarding flags in a single query to avoid extra round trips.
        const { data: spRow } = await supabase
          .from('seller_profiles')
          .select([
            'firstProductCreated',
            'profileCompleted',
            'storeCreated',
            'hasServiceCapability',
            'sellerStatus',
          ].join(', '))
          .eq('userId', user.id)
          .maybeSingle<{
            firstProductCreated: boolean | null;
            profileCompleted: boolean | null;
            storeCreated: boolean | null;
            hasServiceCapability: boolean | null;
            sellerStatus: string | null;
          }>();

        if (!spRow?.firstProductCreated) {
          await supabase
            .from('seller_profiles')
            .update({ firstProductCreated: true })
            .eq('userId', user.id);

          // The DB trigger (trg_sync_seller_onboarding) will auto-set
          // onboardingCompleted when all other flags are also true.
          // Force-check here using the flags we already fetched above.
          // hasServiceCapability will be TRUE after the product insert fires the DB trigger,
          // so we only gate on profileCompleted + storeCreated + sellerStatus here.
          if (
            spRow?.profileCompleted &&
            spRow?.storeCreated &&
            spRow?.sellerStatus !== 'suspended' &&
            spRow?.sellerStatus !== 'rejected'
          ) {
            // onboardingStep 8 = all gate flags satisfied (5 wizard UI steps map to
            // 8 DB sub-steps tracked in seller_profiles; value mirrors ONBOARDING_COMPLETE_STEP
            // in src/pages/onboarding/SellerOnboarding.tsx).
            await supabase
              .from('users')
              .update({ onboardingCompleted: true, onboardingStep: 8 })
              .eq('id', user.id);
          }
        }

        setSuccessMessage(
          publishMode
            ? (created.isApproved
                ? 'Product created and is now live!'
                : 'Product created! It will be visible after admin approval.')
            : 'Draft saved. You can continue editing and publish when ready.'
        );
        if (publishMode && created.id) {
          setPublishedProductId(created.id);
          trackPublishListing(created.id, formData.title);
        }
      }

      // Brief success feedback, then navigate back
      setTimeout(() => navigate('/seller'), SUCCESS_REDIRECT_DELAY_MS);
    } catch (error) {
      console.error('Error saving product:', error);
      const msg =
        (error as { message?: string })?.message ||
        'An unexpected error occurred. Please try again.';
      setErrors({ _form: `Failed to save product: ${msg}` });
    } finally {
      setSaving(false);
      setSavingDraft(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProduct(true);
  };

  const handleSaveDraft = () => {
    saveProduct(false);
  };

  const deleteProduct = async () => {
    if (!user || !id) return;
    setDeleting(true);
    try {
      // product_shipping rows cascade-delete via FK ON DELETE CASCADE
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      navigate('/seller/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      setErrors({ _form: `Failed to delete product: ${(err as { message?: string })?.message ?? 'Unknown error'}` });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change using destructuring to avoid mutation
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // ─── Custom spec helpers ────────────────────────────────────────────────────
  const addCustomSpec = () => setCustomSpecs(prev => [...prev, { key: '', value: '' }]);
  const removeCustomSpec = (i: number) => setCustomSpecs(prev => prev.filter((_, idx) => idx !== i));
  const updateCustomSpec = (i: number, field: 'key' | 'value', val: string) => {
    setCustomSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  if (!user || !hasSellerAccess(user)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-slate-300">You must be a seller to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  const isBulkType = BULK_PRODUCT_TYPES.includes(formData.type);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-4 md:pt-28 pb-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">{id ? 'Edit Listing' : 'Create New Listing'}</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {id ? 'Update your product information below.' : 'Fill in the details below to list your product on the marketplace.'}
            </p>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div className="mb-6 rounded-lg border overflow-hidden border-success/50 bg-success/10">
              <div className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <p className="text-success font-medium text-sm">{successMessage}</p>
              </div>
              {/* Post-publish share CTA — only for newly created published products */}
              {publishedProductId && (
                <div className="border-t px-4 py-3 space-y-2 border-success/40 bg-success/8">
                  <p className="text-xs font-semibold text-green-200">
                    🚀 Your product is live — share it now to get more views!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://loadifymarket.co.uk/product/${publishedProductId}`;
                        trackShareProduct('facebook', publishedProductId, formData.title);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(24,119,242,1)', color: 'rgba(255,255,255,1)' }}
                    >
                      Share on Facebook
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://loadifymarket.co.uk/product/${publishedProductId}`;
                        const text = encodeURIComponent(`Check out my product on Loadify Market: ${url}`);
                        trackShareProduct('whatsapp', publishedProductId, formData.title);
                        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(37,211,102,1)', color: 'rgba(255,255,255,1)' }}
                    >
                      Share on WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = `https://loadifymarket.co.uk/product/${publishedProductId}`;
                        try {
                          await copyToClipboard(url);
                          trackCopyLink(publishedProductId);
                          toast({ title: 'Link copied', description: 'Product link copied to clipboard.' });
                        } catch {
                          toast({ title: 'Could not copy', description: 'Please copy the URL manually.', variant: 'destructive' });
                        }
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-80 bg-primary"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form-level error */}
          {errors._form && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              <p className="text-danger font-medium text-sm">{errors._form}</p>
            </div>
          )}

          {/* Active orders lock banner */}
          {hasActiveOrders && (
            <div className="mb-6 p-4 bg-primary-soft border border-primary/40 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-primary font-semibold text-sm">Some fields are locked</p>
                <p className="text-primary text-xs mt-0.5">
                  This product has active or completed orders. Title, price, stock quantity, and condition cannot be changed.
                  You can still edit the description, images, specifications, and shipping details.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ─── LISTING CONTEXT SELECTOR ─────────────────────────────── */}
            {!id && (
              <div className="bg-surface border border-white/10 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Listing Type</h2>
                <p className="text-sm text-slate-400 mb-4">Choose whether you are listing a service or a physical product.</p>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${listingContext === 'service' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20'}`}>
                    <input
                      type="radio"
                      name="listingContext"
                      value="service"
                      checked={listingContext === 'service'}
                      onChange={() => setListingContext('service')}
                      className="mt-0.5 accent-[#D4AF37]"
                    />
                    <div>
                      <p className="font-semibold text-black text-sm">Service</p>
                      <p className="text-xs text-slate-400 mt-0.5">Digital or in-person service — no stock, no shipping required. Reusable listing.</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${listingContext === 'goods' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20'}`}>
                    <input
                      type="radio"
                      name="listingContext"
                      value="goods"
                      checked={listingContext === 'goods'}
                      onChange={() => setListingContext('goods')}
                      className="mt-0.5 accent-[#D4AF37]"
                    />
                    <div>
                      <p className="font-semibold text-black text-sm">Physical Product</p>
                      <p className="text-xs text-slate-400 mt-0.5">Tangible goods — requires stock quantity and shipping setup.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ─── SECTION 1: Basic Information ─────────────────────────── */}
            <Section title="1. Basic Information">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1">
                  Product Title {hasActiveOrders ? <Lock className="h-3.5 w-3.5 text-primary" /> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  disabled={hasActiveOrders}
                  className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''} ${errors.title ? 'border-red-400' : ''}`}
                  placeholder="e.g., 100x Mixed Electronics Bundle — Various Brands"
                />
                <FieldError msg={errors.title} />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => handleChange('shortDescription', e.target.value)}
                  maxLength={160}
                  className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  placeholder="One-line summary shown in search results (max 160 characters)"
                />
                <p className="text-xs text-slate-500 mt-1">{formData.shortDescription.length}/160</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={6}
                  className={`w-full rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-y ${errors.description ? 'border-red-400' : ''}`}
                  placeholder="Describe your product in detail — condition, contents, brand mix, origin, etc."
                />
                <FieldError msg={errors.description} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1">
                    Listing Type {hasActiveOrders ? <Lock className="h-3.5 w-3.5 text-primary" /> : <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    disabled={hasActiveOrders}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="product">Single Item</option>
                    <option value="retail">Retail Product</option>
                    <option value="handmade">Handmade / Artisan</option>
                    <option value="clearance">Special Offer / Discounted</option>
                    <option value="pallet">Multi-Unit Listing</option>
                    <option value="lot">Bundle / Mixed Lot</option>
                    <option value="wholesale">Trade / Wholesale Price</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1">
                    Condition {hasActiveOrders ? <Lock className="h-3.5 w-3.5 text-primary" /> : <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleChange('condition', e.target.value)}
                    disabled={hasActiveOrders}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="returns_stock">Returns Stock</option>
                    <option value="mixed">Mixed Condition</option>
                    <option value="other">Other</option>
                  </select>
                  {hasActiveOrders && (
                    <p className="text-xs text-primary mt-1">Locked — product has active orders</p>
                  )}
                </div>
              </div>
            </Section>

            {/* ─── SECTION 2: Category ──────────────────────────────────── */}
            <Section title="2. Category">
              {errors.categoryId && (
                <div className="mb-3 p-2 bg-red-950/30 border border-danger/30 rounded flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-danger">{errors.categoryId}</p>
                </div>
              )}
              <CategorySelector
                selectedCategoryId={formData.categoryId}
                selectedSubcategoryId={formData.subcategoryId}
                onCategoryChange={(categoryId) => {
                  handleChange('categoryId', categoryId);
                }}
                onSubcategoryChange={(subcategoryId) => handleChange('subcategoryId', subcategoryId)}
              />
            </Section>

            {/* ─── SECTION 3: Pricing ───────────────────────────────────── */}
            <Section title="3. Pricing">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1">
                    Price (£) {hasActiveOrders ? <Lock className="h-3.5 w-3.5 text-primary" /> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={(e) => handleChange('price', normalizeDecimal(e.target.value))}
                    disabled={hasActiveOrders}
                    className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''} ${errors.price ? 'border-red-400' : ''}`}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter the VAT-inclusive price (20% VAT applied)</p>
                  <FieldError msg={errors.price} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Sale / Discounted Price (£)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.salePrice}
                    onChange={(e) => handleChange('salePrice', normalizeDecimal(e.target.value))}
                    className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${errors.salePrice ? 'border-red-400' : ''}`}
                    placeholder="Optional — leave blank if no discount"
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional. Must be lower than the regular price.</p>
                  <FieldError msg={errors.salePrice} />
                </div>
              </div>

              {formData.price && (
                <div className="mt-3 p-3 bg-surface border border-white/10 rounded-[14px] text-sm text-slate-400">
                  {(() => {
                    const priceNum = parseFloat(formData.price || '0');
                    const exVat = priceNum / 1.2;
                    const vatAmt = priceNum - exVat;
                    return (
                      <>
                        <span className="font-medium">Price ex-VAT: </span>
                        £{exVat.toFixed(2)}
                        {' '}<span className="text-slate-500">(20% VAT: £{vatAmt.toFixed(2)})</span>
                      </>
                    );
                  })()}
                </div>
              )}
            </Section>

            {/* ─── SECTION 4: Inventory ─────────────────────────────────── */}
            {listingContext === 'goods' && (
            <Section title="4. Inventory">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1">
                    Stock Quantity {hasActiveOrders ? <Lock className="h-3.5 w-3.5 text-primary" /> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => handleChange('stockQuantity', e.target.value)}
                    disabled={hasActiveOrders}
                    className={`w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''} ${errors.stockQuantity ? 'border-red-400' : ''}`}
                    placeholder="0"
                  />
                  <FieldError msg={errors.stockQuantity} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Stock Status</label>
                  <div className="w-full h-12 rounded-[14px] border border-white/10 bg-surface/50 cursor-default text-sm text-slate-400 flex items-center px-3">
                    {(() => {
                      const qty = parseInt(formData.stockQuantity || '0', 10);
                      if (isNaN(qty)) return '— Enter quantity above';
                      if (qty > 10) return '✅ In Stock';
                      if (qty > 0) return '⚠️ Low Stock';
                      return '❌ Out of Stock';
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Calculated automatically from quantity</p>
                </div>
              </div>

              {(formData.type === 'wholesale' || formData.type === 'pallet') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Minimum Order Quantity (MOQ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.moq}
                    onChange={(e) => setFormData(prev => ({ ...prev, moq: e.target.value }))}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all max-w-xs"
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum units a buyer must order</p>
                </div>
              )}
            </Section>
            )} {/* end listingContext === 'goods' — Inventory section */}

            {/* ─── SECTION 5: Media ─────────────────────────────────────── */}
            <Section title="5. Product Images">
              <p className="text-sm text-slate-400 mb-4">
                Upload up to 10 images. The first image will be your main product photo.
                Use clear, well-lit photos showing the actual product.
              </p>
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
                maxImages={10}
              />
            </Section>

            {/* ─── SECTION 6: Dimensions & Shipping ────────────────────── */}
            {listingContext === 'goods' && (
            <Section title="6. Dimensions &amp; Shipping">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Length (cm)</label>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.dimensions.length}
                    onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, length: normalizeDecimal(e.target.value) } }))}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Width (cm)</label>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.dimensions.width}
                    onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, width: normalizeDecimal(e.target.value) } }))}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Height (cm)</label>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.dimensions.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, height: normalizeDecimal(e.target.value) } }))}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Weight (kg)</label>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', normalizeDecimal(e.target.value))}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Shipping / Delivery Notes</label>
                <input
                  type="text"
                  value={formData.shippingNotes}
                  onChange={(e) => handleChange('shippingNotes', e.target.value)}
                  className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  placeholder="e.g., Fragile — handle with care, collection preferred for large items"
                />
              </div>

              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.collectionAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, collectionAvailable: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 text-primary focus:ring-primary/40"
                  />
                  <span className="text-sm text-slate-300">Collection available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deliveryAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAvailable: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 text-primary focus:ring-primary/40"
                  />
                  <span className="text-sm text-slate-300">Delivery available</span>
                </label>
              </div>

              {formData.type !== 'pallet' ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Shipping Methods</h3>
                  <p className="text-xs text-slate-400 mb-3">Select the shipping options you offer for this product.</p>
                  <ShippingMethodSelector
                    selectedMethodIds={selectedShippingMethodIds}
                    onChange={setSelectedShippingMethodIds}
                  />
                  {selectedShippingMethodIds.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Estimated Dispatch Time</label>
                      <input
                        type="text"
                        value={dispatchTime}
                        onChange={(e) => setDispatchTime(e.target.value)}
                        className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        placeholder="e.g. 1–2 working days"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <strong>Pallet &amp; bulk listings</strong> — ensure your shipping details and dimensions are accurate so buyers can arrange collection or delivery.
                  </p>
                </div>
              )}
            </Section>
            )} {/* end listingContext === 'goods' — Dimensions & Shipping section */}

            {/* ─── SECTION 7: Specifications ────────────────────────────── */}
            <Section title="7. Specifications">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="e.g., Samsung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="e.g., Galaxy S23"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">SKU / Internal Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="Your ref code"
                  />
                </div>
              </div>

              {/* Custom key-value specs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Additional Specifications</label>
                  <button
                    type="button"
                    onClick={addCustomSpec}
                    className="text-xs text-primary hover:text-primary flex items-center gap-1 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Spec
                  </button>
                </div>
                {customSpecs.length === 0 && (
                  <p className="text-xs text-slate-500 mb-2">
                    Add any extra attributes relevant to your product (e.g., Colour, Material, Storage Capacity).
                  </p>
                )}
                <div className="space-y-2">
                  {customSpecs.map((spec, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => updateCustomSpec(i, 'key', e.target.value)}
                        className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all flex-1"
                        placeholder="Attribute name (e.g., Colour)"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => updateCustomSpec(i, 'value', e.target.value)}
                        className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all flex-1"
                        placeholder="Value (e.g., Black)"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomSpec(i)}
                        className="p-2 text-red-500 hover:text-danger flex-shrink-0"
                        aria-label="Remove spec"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ─── SECTION 8: Listing Type Details (conditional) ─────────── */}
            {isBulkType && (
              <Section title="8. Listing Type Details">
                {/* Pallet-specific fields */}
                {formData.type === 'pallet' && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Pallet Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Number of Pallets</label>
                        <input
                          type="number" min="0"
                          value={formData.palletInfo.palletCount}
                          onChange={(e) => setFormData(prev => ({ ...prev, palletInfo: { ...prev.palletInfo, palletCount: e.target.value } }))}
                          className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Items per Pallet</label>
                        <input
                          type="number" min="0"
                          value={formData.palletInfo.itemsPerPallet}
                          onChange={(e) => setFormData(prev => ({ ...prev, palletInfo: { ...prev.palletInfo, itemsPerPallet: e.target.value } }))}
                          className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Pallet Type</label>
                        <input
                          type="text"
                          value={formData.palletInfo.palletType}
                          onChange={(e) => setFormData(prev => ({ ...prev, palletInfo: { ...prev.palletInfo, palletType: e.target.value } }))}
                          className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          placeholder="e.g., Euro pallet"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Wholesale fields */}
                {formData.type === 'wholesale' && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Wholesale Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Minimum Order Quantity (MOQ)</label>
                        <input
                          type="number" min="1"
                          value={formData.moq}
                          onChange={(e) => setFormData(prev => ({ ...prev, moq: e.target.value }))}
                          className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          placeholder="e.g., 10"
                        />
                        <p className="text-xs text-slate-500 mt-1">Minimum units a buyer must order</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Units in Lot / Batch</label>
                        <input
                          type="number" min="1"
                          value={formData.lotQuantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, lotQuantity: e.target.value }))}
                          className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          placeholder="e.g., 100"
                        />
                        <p className="text-xs text-slate-500 mt-1">Total units available in this lot</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bulk lot fields */}
                {formData.type === 'lot' && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Bulk Lot Details</h3>
                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Number of Items in Lot</label>
                      <input
                        type="number" min="1"
                        value={formData.lotQuantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, lotQuantity: e.target.value }))}
                        className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        placeholder="e.g., 50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Total items sold as one lot</p>
                    </div>
                  </div>
                )}

                {/* Shared bulk/pallet fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Estimated Retail Value (£)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={formData.estimatedRetailValue}
                      onChange={(e) => handleChange('estimatedRetailValue', e.target.value)}
                      className="w-full h-12 rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      placeholder="Optional RRP estimate"
                    />
                    <p className="text-xs text-slate-500 mt-1">Approximate total retail value of the lot</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Manifest / Stock Notes</label>
                    <textarea
                      value={formData.manifestNotes}
                      onChange={(e) => handleChange('manifestNotes', e.target.value)}
                      rows={2}
                      className="w-full rounded-[14px] border border-white/10 bg-surface text-black text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-y"
                      placeholder="e.g., Mixed electronics — approx 40% Grade A, 40% Grade B, 20% parts"
                    />
                  </div>
                </div>
              </Section>
            )}

            {/* ─── SECTION 9: Publish / Save ────────────────────────────── */}
            <div className="bg-surface border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">
                {id ? '9. Save Changes' : '9. Publish Listing'}
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-slate-400">
                  {id ? (
                    <p>Save your changes. Published listings require admin approval before going live.</p>
                  ) : (
                    <>
                      <p className="font-medium text-slate-300 mb-1">Ready to list your product?</p>
                      <p>Use <strong>Save as Draft</strong> to continue editing later, or <strong>Publish</strong> to submit for admin approval.</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/seller')}
                    className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  {!id && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft || saving}
                      className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      {savingDraft ? 'Saving...' : 'Save as Draft'}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving || savingDraft}
                    className="px-4 py-2 rounded-lg text-black text-sm font-semibold disabled:opacity-50 transition-all bg-primary hover:bg-primary-hover"
                  >
                    {saving
                      ? (id && hasActiveOrders ? 'Saving...' : 'Publishing...')
                      : id ? 'Save Changes' : 'Publish Listing'}
                  </button>
                </div>
              </div>

              {/* ── Delete listing (existing products only) ───────────────── */}
              {id && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  {showDeleteConfirm ? (
                    <div className="p-4 bg-red-950/30 border border-danger/30 rounded-lg">
                      <p className="text-sm font-medium text-red-300 mb-3">
                        Permanently delete this listing? This cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={deleteProduct}
                          disabled={deleting}
                          className="px-4 py-2 bg-red-600 text-black text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 border border-white/10 text-slate-300 text-sm font-medium rounded-lg hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={hasActiveOrders}
                        className="flex items-center gap-2 text-sm text-danger hover:text-danger font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete this listing
                      </button>
                      {hasActiveOrders && (
                        <p className="text-xs text-primary">
                          Cannot delete — this product has active or completed orders.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
