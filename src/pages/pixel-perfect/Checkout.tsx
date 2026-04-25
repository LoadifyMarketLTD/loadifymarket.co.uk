import { useState, useEffect, useRef, useMemo } from "react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CreditCard, MapPin, User, Phone, Mail,
  Building2, ShieldCheck, Lock, Truck, Check, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import PaymentMethodBadges from "@/components/PaymentMethodBadges";

// ── Shipping option types ──────────────────────────────────────────────────
interface ShippingOption {
  methodId: string;
  name: string;
  courier: string | null;
  price: number;
  dispatchTime: string | null;
}

// Sentinel value for the "Seller arranged" fallback (no DB methods configured)
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

const Checkout = () => {
  const { cartItems, subtotal } = useCart();
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
  // Track whether we've already auto-filled the email so we never overwrite
  // changes the user makes after the initial sync.
  const emailSyncedRef = useRef(false);

  // ── Shipping method state ────────────────────────────────────────────────
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(SELLER_ARRANGED.methodId);
  const [shippingLoading, setShippingLoading] = useState(false);

  // Derived: the currently selected shipping option
  const selectedOption: ShippingOption =
    shippingOptions.find((o) => o.methodId === selectedMethodId) ?? SELLER_ARRANGED;

  // Stable sorted cart product IDs — only changes when the product set changes.
  // This drives the shipping fetch effect without re-triggering on quantity updates.
  const cartProductIds = useMemo(
    () => cartItems.map((i) => i.product.id).sort(),
    [cartItems],
  );

  // Fetch available shipping methods for the cart products
  useEffect(() => {
    if (cartProductIds.length === 0) return;
    const productIds = cartProductIds;

    const fetchShippingOptions = async () => {
      setShippingLoading(true);
      try {
        const { supabase } = await import("@/lib/supabase");

        // Fetch product_shipping rows joined to shipping_methods and shipping_rates
        // for all products in the cart, taking the lowest-price rate per method.
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
          .in("product_id", productIds);

        if (error || !data) {
          // Non-fatal: fall back to seller-arranged
          setShippingOptions([]);
          setSelectedMethodId(SELLER_ARRANGED.methodId);
          return;
        }

        // Build a map of methodId → ShippingOption, keeping min price across rows
        const optionMap = new Map<string, ShippingOption>();
        for (const row of data) {
          const method = Array.isArray(row.shipping_methods)
            ? row.shipping_methods[0]
            : row.shipping_methods;
          if (!method || !method.active) continue;

          const rates: Array<{ price: number }> = Array.isArray(method.shipping_rates)
            ? method.shipping_rates
            : method.shipping_rates
              ? [method.shipping_rates]
              : [];

          const price = rates.length > 0
            ? Math.min(...rates.map((r) => Number(r.price)))
            : 0;

          if (!optionMap.has(method.id)) {
            optionMap.set(method.id, {
              methodId: method.id,
              name: method.name,
              courier: method.courier ?? null,
              price,
              dispatchTime: (row as Record<string, unknown>).dispatch_time as string | null,
            });
          }
        }

        const options = Array.from(optionMap.values()).sort((a, b) => a.price - b.price);

        if (options.length > 0) {
          setShippingOptions(options);
          setSelectedMethodId(options[0].methodId);
        } else {
          setShippingOptions([]);
          setSelectedMethodId(SELLER_ARRANGED.methodId);
        }
      } catch {
        // Non-fatal: fall back to seller-arranged
        setShippingOptions([]);
        setSelectedMethodId(SELLER_ARRANGED.methodId);
      } finally {
        setShippingLoading(false);
      }
    };

    void fetchShippingOptions();
  }, [cartProductIds]);
  // ────────────────────────────────────────────────────────────────────────

  // Sync email once auth resolves (user may be null at initial render)
  useEffect(() => {
    if (user?.email && !emailSyncedRef.current) {
      emailSyncedRef.current = true;
      setShippingData((prev) => ({ ...prev, email: user.email ?? "" }));
    }
  }, [user?.email]);

  const handleContinueToPayment = () => {
    // Validate required shipping fields before advancing
    if (!shippingData.firstName.trim() || !shippingData.lastName.trim()) {
      setShippingError("Please enter your first and last name.");
      return;
    }
    if (!shippingData.email.trim()) {
      setShippingError("Please enter a valid email address.");
      return;
    }
    if (!shippingData.address1.trim()) {
      setShippingError("Please enter your street address.");
      return;
    }
    if (!shippingData.city.trim() || !shippingData.postcode.trim()) {
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

  // For 20% VAT on VAT-inclusive prices: VAT portion = gross / 6
  // (gross = net * 1.2, so VAT = gross - net = gross - gross/1.2 = gross/6)
  const vat = Math.round(subtotal / 6);
  const shippingAmount = selectedOption.price;
  const total = subtotal + shippingAmount;

  // ── Submit to Stripe via Netlify function ──────────────────────────────────
  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);

    // Block purchase of own products
    if (user) {
      const ownProductInCart = cartItems.find(
        (item) => item.product.sellerId && item.product.sellerId === user.id
      );
      if (ownProductInCart) {
        setCheckoutError(
          `You cannot purchase your own product "${ownProductInCart.product.title}". Please remove it from your cart.`
        );
        setIsSubmitting(false);
        return;
      }
    }

    // P3: Single-seller enforcement — multi-seller checkout is temporarily
    // disabled. The backend enforces this too; this check gives better UX.
    const sellerIds = new Set(
      cartItems.map((item) => item.product.sellerId).filter((id): id is string => Boolean(id))
    );
    if (sellerIds.size > 1) {
      setCheckoutError(
        "For now, please complete purchases from one seller at a time. Please split your cart and checkout each seller separately."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const address = {
        line1: shippingData.address1,
        ...(shippingData.address2 ? { line2: shippingData.address2 } : {}),
        city: shippingData.city,
        postal_code: shippingData.postcode,
        country: "GB",
      };

      const items = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        title: item.product.title,
        // sellerId is overridden server-side from the DB price validation step
        // in create-checkout.ts, so the client-side value is a safe placeholder.
        sellerId: "",
      }));

      const body = {
        items,
        buyerId: user?.id ?? "",
        guestEmail: !user ? shippingData.email : undefined,
        shippingAmount,
        shippingMethod: selectedOption.methodId === SELLER_ARRANGED.methodId
          ? "Seller arranged"
          : selectedOption.name,
        shippingAddress: address,
        billingAddress: address,
      };

      // Send the Supabase session token so the server can verify buyerId.
      const { supabase } = await import("@/lib/supabase");
      const { data: { session: authSession } } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authSession?.access_token) {
        headers["Authorization"] = `Bearer ${authSession.access_token}`;
      }

      const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed. Please try again.");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  // Redirect to cart if empty
  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <SEO
          title="Checkout | Loadify Market"
          description="Complete your purchase securely on Loadify Market."
          canonical="/checkout"
          robots="noindex,nofollow"
        />
        <main id="main-content" className="pt-28 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Add some items before checking out.</p>
            <Link to="/catalog">
              <Button className="bg-gradient-hero text-primary-foreground font-semibold">
                Browse Catalog <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>
    </MainLayout>
    );
  }

  // P1: Sign-in required wall — shown when cart has items but buyer is not authenticated.
  // The isLoading check prevents a flash while auth is initialising on page load.
  if (!isLoading && !user) {
    return (
      <MainLayout>
        <SEO
          title="Checkout | Loadify Market"
          description="Complete your purchase securely on Loadify Market."
          canonical="/checkout"
          robots="noindex,nofollow"
        />
        <main id="main-content" className="pt-28 pb-16">
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
                <Button className="bg-gradient-hero text-primary-foreground font-semibold w-full sm:w-auto">
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
      <main id="main-content" className="pt-28 pb-16">
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

          {/* Steps */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    i === currentStep
                      ? "bg-gradient-hero text-primary-foreground shadow-elevated"
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
            {/* Main content */}
            <div>
              {/* Step 1: Shipping */}
              {currentStep === 0 && (
                <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">Shipping Details</h2>
                      <p className="text-sm text-muted-foreground">Where should we deliver your order?</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" name="firstName" placeholder="John" className="pl-10 h-11" value={shippingData.firstName} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="lastName" name="lastName" placeholder="Doe" className="pl-10 h-11" value={shippingData.lastName} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" name="email" type="email" placeholder="john@company.com" className="pl-10 h-11" value={shippingData.email} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" name="phone" placeholder="+44 7700 900000" className="pl-10 h-11" value={shippingData.phone} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="company">Company (optional)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="company" name="company" placeholder="Acme Ltd" className="pl-10 h-11" value={shippingData.company} onChange={handleShippingChange} />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address1">Address Line 1</Label>
                      <Input id="address1" name="address1" placeholder="123 High Street" className="h-11" value={shippingData.address1} onChange={handleShippingChange} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address2">Address Line 2 (optional)</Label>
                      <Input id="address2" name="address2" placeholder="Unit 4, Industrial Estate" className="h-11" value={shippingData.address2} onChange={handleShippingChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" placeholder="Manchester" className="h-11" value={shippingData.city} onChange={handleShippingChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="county">County</Label>
                      <Input id="county" name="county" placeholder="Greater Manchester" className="h-11" value={shippingData.county} onChange={handleShippingChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input id="postcode" name="postcode" placeholder="M1 1AA" className="h-11" value={shippingData.postcode} onChange={handleShippingChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value="United Kingdom" disabled className="h-11 bg-muted" />
                    </div>
                  </div>

                  {shippingError && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      {shippingError}
                    </div>
                  )}

                  {/* Shipping method selection */}
                  <div className="space-y-3">
                    <Label>Delivery Method</Label>
                    {shippingLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading delivery options…
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
                              {option.price === 0 ? "Free" : `£${option.price.toFixed(2)}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4 shrink-0" />
                        Delivery cost will be confirmed by the seller after purchase.
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleContinueToPayment}
                    className="w-full sm:w-auto h-11 bg-gradient-hero text-primary-foreground font-semibold px-8"
                  >
                    Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
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

                  {/* Stripe secure payment notice */}
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Lock className="h-4 w-4" />
                      Secure Payment via Stripe
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your payment details are handled securely by Stripe — the world's leading payment
                      processor. You'll be redirected to Stripe's secure checkout page to complete your
                      payment. We never store your card details.
                    </p>
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
                      className="flex-1 h-11 bg-gradient-hero text-primary-foreground font-semibold"
                    >
                      Review Order <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Shipping summary */}
                  <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground">Shipping Address</h3>
                      </div>
                      <button onClick={() => setCurrentStep(0)} className="text-sm text-primary hover:underline">Edit</button>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                      <p className="font-medium text-foreground">
                        {shippingData.firstName || "John"} {shippingData.lastName || "Doe"}
                      </p>
                      {shippingData.company && <p>{shippingData.company}</p>}
                      <p>{shippingData.address1 || "123 High Street"}</p>
                      {shippingData.address2 && <p>{shippingData.address2}</p>}
                      <p>
                        {shippingData.city || "Manchester"}, {shippingData.county || "Greater Manchester"}{" "}
                        {shippingData.postcode || "M1 1AA"}
                      </p>
                      <p>United Kingdom</p>
                    </div>
                  </div>

                  {/* Payment summary */}
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

                  {/* Items */}
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
                            £{(item.product.price * item.quantity).toLocaleString()}
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

                  {/* Intermediary notice */}
                  <div className="rounded-lg bg-muted/50 border border-border p-4 text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Marketplace Notice:</span>{" "}
                    You are buying from independent seller(s). Loadify Market provides the marketplace platform and does not own, stock, fulfil, or deliver the products. The sales contract is between you and the seller.
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="h-11" disabled={isSubmitting}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="flex-1 h-12 bg-gradient-accent text-accent-foreground font-bold text-base hover:opacity-90 transition-opacity"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Redirecting to Stripe…
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-5 w-5" />
                          Pay Securely · £{total.toLocaleString()}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
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
                        £{(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground font-medium">£{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground font-medium">
                      {shippingOptions.length === 0
                        ? <span className="italic text-muted-foreground">Set by seller</span>
                        : shippingAmount === 0
                          ? "Free"
                          : `£${shippingAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (20%)</span>
                    <span className="text-foreground font-medium">£{vat.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-display font-semibold text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-foreground">£{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">Marketplace Assurance</p>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  You are purchasing from independent seller(s)
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Secure payment via Stripe
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Seller fulfils and delivers your order
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
