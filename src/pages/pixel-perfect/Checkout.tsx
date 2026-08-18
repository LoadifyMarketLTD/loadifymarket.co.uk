import { useState, useEffect, useRef, useMemo } from "react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CreditCard, MapPin, User, Phone, Mail,
  Building2, ShieldCheck, Lock, Truck, Check, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import PaymentMethodBadges from "@/components/PaymentMethodBadges";
import { openExternalUrl } from "@/lib/capacitorUtils";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { calculateCheckoutPricing, poundsFromPence } from "@/lib/checkoutPricing";

interface ShippingOption {
  methodId: string;
  name: string;
  courier: string | null;
  price: number;
  dispatchTime: string | null;
}

interface ShippingMethodRelation {
  id: string;
  name: string;
  courier?: string | null;
  active: boolean;
  shipping_rates?: Array<{ price: number }> | { price: number } | null;
}

const SELLER_ARRANGED: ShippingOption = {
  methodId: "seller-arranged",
  name: "Seller Arranged",
  courier: null,
  price: 0,
  dispatchTime: null,
};

const steps = [
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Check },
];

function money(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const Checkout = () => {
  const { cartItems, refreshCartPrices, priceChangedBanner, dismissPriceBanner } = useCart();
  const { user, isLoading } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [shippingData, setShippingData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email ?? "",
    phone: "",
    company: "",
    address1: "",
    address2: "",
    city: "",
    county: "",
    postcode: "",
  });

  const [shippingError, setShippingError] = useState<string | null>(null);
  const emailSyncedRef = useRef(false);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(SELLER_ARRANGED.methodId);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null);
  const [isServiceOnlyCart, setIsServiceOnlyCart] = useState(false);

  const [applyReverseCharge, setApplyReverseCharge] = useState(false);
  const [taxProfileLoading, setTaxProfileLoading] = useState(false);

  const selectedOption: ShippingOption =
    shippingOptions.find((o) => o.methodId === selectedMethodId) ?? SELLER_ARRANGED;
  const noDeliveryMethodAvailable =
    !shippingLoading &&
    !isServiceOnlyCart &&
    (shippingOptions.length === 0 || Boolean(shippingOptionsError));

  const cartProductIds = useMemo(
    () => [...new Set(cartItems.map((i) => i.product.id))].sort(),
    [cartItems],
  );

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setApplyReverseCharge(false);
      setTaxProfileLoading(false);
      return () => { cancelled = true; };
    }

    setTaxProfileLoading(true);
    void supabase
      .from("buyer_profiles")
      .select("accountType, isVatVerified")
      .eq("userId", user.id)
      .maybeSingle<{ accountType: string | null; isVatVerified: boolean | null }>()
      .then(({ data }) => {
        if (cancelled) return;
        const isB2B = Boolean(data?.accountType) && data?.accountType !== "individual";
        setApplyReverseCharge(isB2B && Boolean(data?.isVatVerified));
      })
      .catch(() => {
        if (!cancelled) setApplyReverseCharge(false);
      })
      .finally(() => {
        if (!cancelled) setTaxProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    if (cartProductIds.length === 0) {
      setShippingOptions([]);
      setSelectedMethodId(SELLER_ARRANGED.methodId);
      setShippingOptionsError(null);
      setIsServiceOnlyCart(false);
      setShippingLoading(false);
      return () => { cancelled = true; };
    }

    const fetchShippingOptions = async () => {
      setShippingLoading(true);
      setShippingOptionsError(null);

      try {
        const { data: products, error: productError } = await supabase
          .from("products")
          .select("id, listingContext")
          .in("id", cartProductIds);

        if (cancelled) return;
        if (productError || !products || products.length !== cartProductIds.length) {
          setIsServiceOnlyCart(false);
          setShippingOptions([]);
          setSelectedMethodId(SELLER_ARRANGED.methodId);
          setShippingOptionsError("Unable to verify delivery requirements for every item. Please refresh the cart and try again.");
          return;
        }

        const physicalProductIds = products
          .filter((row) => row.listingContext !== "service")
          .map((row) => row.id);

        if (physicalProductIds.length === 0) {
          setIsServiceOnlyCart(true);
          setShippingOptions([]);
          setSelectedMethodId(SELLER_ARRANGED.methodId);
          setShippingOptionsError(null);
          return;
        }

        setIsServiceOnlyCart(false);

        const { data, error } = await supabase
          .from("product_shipping")
          .select(`
            product_id,
            dispatch_time,
            shipping_methods!method_id (
              id,
              name,
              courier,
              active,
              shipping_rates ( price )
            )
          `)
          .in("product_id", physicalProductIds);

        if (cancelled) return;
        if (error || !data) {
          setShippingOptions([]);
          setSelectedMethodId(SELLER_ARRANGED.methodId);
          setShippingOptionsError("Unable to load delivery methods. Please try again.");
          return;
        }

        const methodMap = new Map<string, { option: ShippingOption; productIds: Set<string> }>();

        for (const rawRow of data as unknown as Array<Record<string, unknown>>) {
          const productId = typeof rawRow.product_id === "string" ? rawRow.product_id : "";
          if (!productId) continue;

          const relation = rawRow.shipping_methods as ShippingMethodRelation | ShippingMethodRelation[] | null;
          const method = Array.isArray(relation) ? relation[0] : relation;
          if (!method || !method.active) continue;

          const rawRates = Array.isArray(method.shipping_rates)
            ? method.shipping_rates
            : method.shipping_rates
              ? [method.shipping_rates]
              : [];
          const validRates = rawRates
            .map((rate) => Number(rate.price))
            .filter((price) => Number.isFinite(price) && price >= 0);
          if (validRates.length === 0) continue;

          const price = Math.min(...validRates);
          const existing = methodMap.get(method.id);
          if (existing) {
            existing.productIds.add(productId);
          } else {
            methodMap.set(method.id, {
              option: {
                methodId: method.id,
                name: method.name,
                courier: method.courier ?? null,
                price,
                dispatchTime: typeof rawRow.dispatch_time === "string" ? rawRow.dispatch_time : null,
              },
              productIds: new Set([productId]),
            });
          }
        }

        const options = Array.from(methodMap.values())
          .filter(({ productIds }) => productIds.size === physicalProductIds.length)
          .map(({ option }) => option)
          .sort((a, b) => a.price - b.price);

        setShippingOptions(options);
        setShippingOptionsError(
          options.length === 0
            ? "No single delivery method is currently available for every physical item in this cart."
            : null,
        );
        setSelectedMethodId((current) =>
          options.some((option) => option.methodId === current)
            ? current
            : options[0]?.methodId ?? SELLER_ARRANGED.methodId,
        );
      } catch {
        if (cancelled) return;
        setIsServiceOnlyCart(false);
        setShippingOptions([]);
        setSelectedMethodId(SELLER_ARRANGED.methodId);
        setShippingOptionsError("Unable to load delivery methods. Please try again.");
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    };

    void fetchShippingOptions();
    return () => { cancelled = true; };
  }, [cartProductIds]);

  useEffect(() => {
    void refreshCartPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.email && !emailSyncedRef.current) {
      emailSyncedRef.current = true;
      setShippingData((prev) => ({ ...prev, email: user.email ?? "" }));
    }
  }, [user?.email]);

  const shippingAmount = isServiceOnlyCart ? 0 : selectedOption.price;
  const pricing = useMemo(
    () => calculateCheckoutPricing(
      cartItems.map((item) => ({ price: item.product.price, quantity: item.quantity })),
      shippingAmount,
      applyReverseCharge,
    ),
    [cartItems, shippingAmount, applyReverseCharge],
  );
  const catalogSubtotal = poundsFromPence(pricing.catalogSubtotalPence);
  const chargeableSubtotal = poundsFromPence(pricing.chargeableSubtotalPence);
  const vatIncluded = poundsFromPence(pricing.vatIncludedPence);
  const reverseChargeAdjustment = poundsFromPence(pricing.reverseChargeAdjustmentPence);
  const total = poundsFromPence(pricing.totalPence);

  const handleContinueToPayment = () => {
    if (shippingLoading || taxProfileLoading) {
      setShippingError("Please wait while checkout details are being verified.");
      return;
    }
    if (noDeliveryMethodAvailable) {
      setShippingError(shippingOptionsError ?? "This seller has not configured a delivery method for all physical items in your cart yet.");
      return;
    }
    if (!shippingData.firstName.trim() || !shippingData.lastName.trim()) {
      setShippingError("Please enter your first and last name.");
      return;
    }
    if (!shippingData.email.trim()) {
      setShippingError("Please enter a valid email address.");
      return;
    }
    if (!isServiceOnlyCart && !shippingData.address1.trim()) {
      setShippingError("Please enter your street address.");
      return;
    }
    if (!isServiceOnlyCart && (!shippingData.city.trim() || !shippingData.postcode.trim())) {
      setShippingError("Please enter your city and postcode.");
      return;
    }
    setShippingError(null);
    setCurrentStep(1);
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (shippingError) setShippingError(null);
  };

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);

    if (shippingLoading || taxProfileLoading) {
      setCheckoutError("Checkout details are still being verified. Please try again in a moment.");
      setIsSubmitting(false);
      return;
    }

    if (user) {
      const ownProductInCart = cartItems.find(
        (item) => item.product.sellerId && item.product.sellerId === user.id,
      );
      if (ownProductInCart) {
        setCheckoutError(
          `You cannot purchase your own product "${ownProductInCart.product.title}". Please remove it from your cart.`,
        );
        setIsSubmitting(false);
        return;
      }
    }

    const sellerIds = new Set(
      cartItems.map((item) => item.product.sellerId).filter((id): id is string => Boolean(id)),
    );
    if (sellerIds.size > 1) {
      setCheckoutError(
        "For now, please complete purchases from one seller at a time. Please split your cart and checkout each seller separately.",
      );
      setIsSubmitting(false);
      return;
    }

    if (
      !isServiceOnlyCart &&
      (noDeliveryMethodAvailable || selectedOption.methodId === SELLER_ARRANGED.methodId)
    ) {
      setCheckoutError(shippingOptionsError ?? "This seller has not configured a delivery method for all physical items in your cart yet.");
      setIsSubmitting(false);
      return;
    }

    try {
      const items = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        title: item.product.title,
        sellerId: "",
      }));

      const body: Record<string, unknown> = {
        items,
        buyerId: user?.id ?? "",
      };

      if (!isServiceOnlyCart) {
        const address = {
          line1: shippingData.address1,
          ...(shippingData.address2 ? { line2: shippingData.address2 } : {}),
          city: shippingData.city,
          postal_code: shippingData.postcode,
          country: "GB",
        };
        body.shippingMethodId = selectedOption.methodId;
        body.shippingMethod = selectedOption.name;
        body.shippingAddress = address;
        body.billingAddress = address;
      }

      const res = await authorizedFetch("/.netlify/functions/create-checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed. Please try again.");
      }

      if (data.url) {
        await openExternalUrl(data.url);
      } else {
        throw new Error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <SEO
          title="Checkout | Loadify Market"
          description="Complete your purchase securely on Loadify Market."
          canonical="/checkout"
          robots="noindex,nofollow"
        />
        <main id="main-content" className="pt-4 md:pt-28 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Add some items before checking out.</p>
            <Link to="/catalog">
              <Button className="bg-primary hover:bg-primary-hover text-black font-semibold">
                Browse Catalog <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!isLoading && !user) {
    return (
      <MainLayout>
        <SEO
          title="Checkout | Loadify Market"
          description="Complete your purchase securely on Loadify Market."
          canonical="/checkout"
          robots="noindex,nofollow"
        />
        <main id="main-content" className="pt-4 md:pt-28 pb-16">
          <div className="container mx-auto px-4 py-20 flex flex-col items-center text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              Sign In to Checkout
            </h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to complete your purchase securely. Your cart has been saved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/login?next=${encodeURIComponent('/checkout')}`}>
                <Button className="bg-primary hover:bg-primary-hover text-black font-semibold w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="w-full sm:w-auto">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO
        title="Checkout | Loadify Market"
        description="Complete your purchase securely on Loadify Market."
        canonical="/checkout"
        robots="noindex,nofollow"
      />
      <main id="main-content" className="pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Cart", to: "/cart" },
              { label: "Checkout" },
            ]}
            backTo="/cart"
            backLabel="Back to Cart"
          />

          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all ${
                    i === currentStep
                      ? "bg-primary hover:bg-primary-hover text-black shadow-elevated"
                      : i < currentStep
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-8 sm:w-16 h-px ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {priceChangedBanner && (
              <div className="lg:col-span-2 flex items-start justify-between gap-3 bg-primary-soft border border-primary/40 rounded-xl p-4 text-sm text-primary">
                <span><strong>Prices updated:</strong> Some prices have been updated since you added items to your cart. Please review the totals below before proceeding.</span>
                <button onClick={dismissPriceBanner} aria-label="Dismiss" className="shrink-0 mt-0.5 text-primary hover:text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div>
              {currentStep === 0 && (
                <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {isServiceOnlyCart ? "Contact Details" : "Shipping Details"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {isServiceOnlyCart
                          ? "Your provider can use these details to contact you about the service."
                          : "Where should we deliver your order?"}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" name="firstName" placeholder="John" className="pl-10 h-11" value={shippingData.firstName} onChange={handleShippingChange} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="lastName" name="lastName" placeholder="Doe" className="pl-10 h-11" value={shippingData.lastName} onChange={handleShippingChange} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" name="email" type="email" placeholder="john@company.com" className="pl-10 h-11" value={shippingData.email} onChange={handleShippingChange} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" name="phone" type="tel" placeholder="+44 7700 900000" className="pl-10 h-11" value={shippingData.phone} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="company">Company (optional)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="company" name="company" placeholder="Acme Ltd" className="pl-10 h-11" value={shippingData.company} onChange={handleShippingChange} />
                      </div>
                    </div>

                    {!isServiceOnlyCart && (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="address1">Address Line 1</Label>
                          <Input id="address1" name="address1" placeholder="123 High Street" className="h-11" value={shippingData.address1} onChange={handleShippingChange} required />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="address2">Address Line 2 (optional)</Label>
                          <Input id="address2" name="address2" placeholder="Unit 4, Industrial Estate" className="h-11" value={shippingData.address2} onChange={handleShippingChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" name="city" placeholder="Manchester" className="h-11" value={shippingData.city} onChange={handleShippingChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="county">County</Label>
                          <Input id="county" name="county" placeholder="Greater Manchester" className="h-11" value={shippingData.county} onChange={handleShippingChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postcode">Postcode</Label>
                          <Input id="postcode" name="postcode" placeholder="M1 1AA" className="h-11" value={shippingData.postcode} onChange={handleShippingChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input value="United Kingdom" disabled className="h-11 bg-muted" />
                        </div>
                      </>
                    )}
                  </div>

                  {shippingError && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      {shippingError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>{isServiceOnlyCart ? "Fulfilment" : "Delivery Method"}</Label>
                    {shippingLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying delivery requirements…
                      </div>
                    ) : isServiceOnlyCart ? (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>No physical delivery is required for this service order.</span>
                      </div>
                    ) : shippingOptions.length > 0 ? (
                      <div className="space-y-2">
                        {shippingOptions.map((option) => (
                          <label
                            key={option.methodId}
                            className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              selectedMethodId === option.methodId
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value={option.methodId}
                                checked={selectedMethodId === option.methodId}
                                onChange={() => setSelectedMethodId(option.methodId)}
                                className="accent-primary"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">{option.name}</p>
                                {(option.courier || option.dispatchTime) && (
                                  <p className="text-xs text-muted-foreground">
                                    {[option.courier, option.dispatchTime].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-foreground shrink-0">
                              {option.price === 0 ? "Free" : `£${money(option.price)}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>{shippingOptionsError ?? "This seller has not configured delivery for every physical item in this cart yet."}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleContinueToPayment}
                    disabled={shippingLoading || taxProfileLoading || noDeliveryMethodAvailable}
                    className="w-full sm:w-auto h-11 bg-primary hover:bg-primary-hover text-black font-semibold px-8"
                  >
                    Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">Payment Method</h2>
                      <p className="text-sm text-muted-foreground">All payments are securely processed via Stripe</p>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Lock className="h-4 w-4" />
                      Secure Payment via Stripe
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your payment details are handled securely by Stripe. You'll be redirected to Stripe's secure checkout page to complete your payment. We never store your card details.
                    </p>
                    {applyReverseCharge && (
                      <div className="rounded-lg border border-primary/25 bg-background/70 p-3 text-sm text-foreground">
                        Your VAT-verified business account qualifies for reverse charge on item prices. The amount shown below matches the amount sent to Stripe.
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">256-bit SSL encrypted · PCI-DSS compliant</span>
                    </div>
                    <div className="border-t border-border pt-4">
                      <PaymentMethodBadges showLabel={true} size="sm" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep(0)} className="h-11">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={taxProfileLoading}
                      className="flex-1 h-11 bg-primary hover:bg-primary-hover text-black font-semibold"
                    >
                      Review Order <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground">
                          {isServiceOnlyCart ? "Contact Details" : "Shipping Address"}
                        </h3>
                      </div>
                      <button onClick={() => setCurrentStep(0)} className="text-sm text-primary hover:underline">Edit</button>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                      <p className="font-medium text-foreground">
                        {shippingData.firstName} {shippingData.lastName}
                      </p>
                      <p>{shippingData.email}</p>
                      {shippingData.phone && <p>{shippingData.phone}</p>}
                      {shippingData.company && <p>{shippingData.company}</p>}
                      {isServiceOnlyCart ? (
                        <p className="mt-2">No delivery address is required for this service order.</p>
                      ) : (
                        <>
                          <p>{shippingData.address1}</p>
                          {shippingData.address2 && <p>{shippingData.address2}</p>}
                          <p>{shippingData.city}{shippingData.county ? `, ${shippingData.county}` : ""} {shippingData.postcode}</p>
                          <p>United Kingdom</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground">Payment Method</h3>
                      </div>
                      <button onClick={() => setCurrentStep(1)} className="text-sm text-primary hover:underline">Edit</button>
                    </div>
                    <div className="text-sm text-muted-foreground pl-[52px]">
                      <p>Card details entered securely on Stripe's checkout page</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <h3 className="font-display font-semibold text-foreground">Order Items</h3>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                            <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1">{item.product.title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {item.product.seller}</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">
                            £{money(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                      {checkoutError}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/50 border border-border p-4 text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Marketplace Notice:</span>{" "}
                    You are buying from an independent seller. Loadify Market provides the marketplace platform and does not own, stock, fulfil, or deliver the products. The sales contract is between you and the seller.
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="h-11" disabled={isSubmitting}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={
                        isSubmitting ||
                        shippingLoading ||
                        taxProfileLoading ||
                        (!isServiceOnlyCart && (noDeliveryMethodAvailable || selectedOption.methodId === SELLER_ARRANGED.methodId))
                      }
                      className="flex-1 h-12 bg-primary hover:bg-primary-hover text-black font-bold text-base hover:opacity-90 transition-opacity"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Redirecting to Stripe…
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-5 w-5" />
                          Pay Securely · £{money(total)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-24 h-fit space-y-4">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h2 className="font-display text-lg font-semibold text-foreground">Order Summary</h2>

                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{item.product.title}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        £{money(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catalog subtotal</span>
                    <span className="text-foreground font-medium">£{money(catalogSubtotal)}</span>
                  </div>
                  {applyReverseCharge && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT reverse charge</span>
                      <span className="text-foreground font-medium">−£{money(reverseChargeAdjustment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground font-medium">
                      {isServiceOnlyCart
                        ? "Not required"
                        : shippingOptions.length === 0
                          ? <span className="italic text-muted-foreground">Unavailable</span>
                          : shippingAmount === 0
                            ? "Free"
                            : `£${money(shippingAmount)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {applyReverseCharge ? "VAT charged at checkout" : "VAT included (20%)"}
                    </span>
                    <span className="text-foreground font-medium">
                      £{money(applyReverseCharge ? 0 : vatIncluded)}
                    </span>
                  </div>
                  {applyReverseCharge && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">VAT-exclusive item subtotal</span>
                      <span className="text-foreground">£{money(chargeableSubtotal)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-display font-semibold text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-foreground">£{money(total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Marketplace Assurance</p>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  You are purchasing from an independent seller
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Secure payment via Stripe
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {isServiceOnlyCart ? "Seller provides the purchased service" : "Seller fulfils and delivers your order"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default Checkout;
