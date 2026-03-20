import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CreditCard, MapPin, User, Phone, Mail,
  Building2, ShieldCheck, Lock, Truck, Check, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { useCart } from "@/contexts/CartContext";

const steps = [
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Check },
];

const Checkout = () => {
  const { cartItems, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [shippingData, setShippingData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address1: "",
    address2: "",
    city: "",
    county: "",
    postcode: "",
  });

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const shipping = subtotal > 2000 ? 0 : 149;
  const vat = Math.round(subtotal * 0.2);
  const total = subtotal + shipping + vat;

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
    clearCart();
  };

  // Redirect to cart if empty and no order placed
  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
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
        <Footer />
      </div>
    );
  }

  // Order confirmation screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center space-y-6 py-16">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">Order Placed!</h1>
              <p className="text-muted-foreground text-lg">
                Thank you for your order. Your order reference is <span className="font-semibold text-foreground">#{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive a confirmation email shortly. This is a demo — no real payment has been processed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link to="/catalog">
                  <Button className="bg-gradient-hero text-primary-foreground font-semibold">
                    Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/dashboard/orders">
                  <Button variant="outline">View Orders</Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
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

                  <Button
                    onClick={() => setCurrentStep(1)}
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

                  {/* Stripe-style card form (UI only) */}
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 space-y-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Lock className="h-4 w-4" />
                      Secure Payment
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Name on Card</Label>
                        <Input id="cardName" placeholder="John Doe" className="h-11 bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="cardNumber" placeholder="4242 4242 4242 4242" className="pl-10 h-11 bg-background" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input id="expiry" placeholder="MM / YY" className="h-11 bg-background" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input id="cvc" placeholder="123" className="h-11 bg-background" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-60" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 opacity-60" />
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
                      <p>Visa ending in •••• 4242</p>
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

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep(1)} className="h-11">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      className="flex-1 h-12 bg-gradient-accent text-accent-foreground font-bold text-base hover:opacity-90 transition-opacity"
                    >
                      <Lock className="mr-2 h-5 w-5" />
                      Place Order · £{total.toLocaleString()}
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
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground font-medium">{shipping === 0 ? <span className="text-primary">Free</span> : `£${shipping}`}</span>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  Buyer Protection included
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-primary shrink-0" />
                  256-bit SSL encrypted
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  Free shipping over £2,000
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
