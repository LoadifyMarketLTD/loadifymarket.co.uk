import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck, Truck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal > 2000 ? 0 : 149;
  const vat = Math.round((subtotal - discount) * 0.2);
  const total = subtotal - discount + shipping + vat;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center space-y-6 py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Your cart is empty</h1>
              <p className="text-muted-foreground">
                Looks like you haven't added any items yet. Browse our catalog to find great deals.
              </p>
              <Link to="/catalog">
                <Button size="lg" className="bg-gradient-hero text-primary-foreground font-semibold">
                  Browse Catalog <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
              { label: "Catalog", to: "/catalog" },
              { label: "Shopping Cart" },
            ]}
            backTo="/catalog"
          />
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Shopping Cart</h1>
              <p className="text-sm text-muted-foreground mt-1">{cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart</p>
            </div>
            <Link to="/catalog" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Link>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* Cart Items */}
            <div className="space-y-4">
              {cartItems.map((item) => {
                const { product } = item;
                const itemDiscount = product.originalPrice
                  ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="bg-card rounded-xl border border-border p-4 sm:p-5 flex gap-4 group hover:border-primary/20 hover:shadow-card transition-all"
                  >
                    {/* Image */}
                    <Link to={`/product/${product.id}`} className="shrink-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/product/${product.id}`} className="hover:text-primary transition-colors">
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground line-clamp-2 leading-snug">
                              {product.title}
                            </h3>
                          </Link>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">{product.seller}</span>
                          {product.sellerVerified && (
                            <span className="text-xs text-primary font-medium">✓ Verified</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{product.condition}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{product.location}</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        {/* Quantity */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="p-2 hover:bg-background rounded-l-lg transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5 text-foreground" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="p-2 hover:bg-background rounded-r-lg transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-display text-base sm:text-lg font-bold text-foreground">
                            £{(product.price * item.quantity).toLocaleString()}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-muted-foreground">
                              £{product.price.toLocaleString()} each
                            </div>
                          )}
                          {itemDiscount > 0 && (
                            <div className="text-xs text-destructive font-medium">-{itemDiscount}% off</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:sticky lg:top-24 h-fit space-y-4">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <h2 className="font-display text-lg font-semibold text-foreground">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span className="font-medium text-foreground">£{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-primary">
                      <span>Promo discount (10%)</span>
                      <span className="font-medium">-£{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground">
                      {shipping === 0 ? (
                        <span className="text-primary">Free</span>
                      ) : (
                        `£${shipping}`
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">VAT (20%)</span>
                    <span className="font-medium text-foreground">£{vat.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-display font-semibold text-foreground">Total</span>
                    <span className="font-display text-xl font-bold text-foreground">£{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (promoCode.trim()) setPromoApplied(true);
                      }}
                      disabled={promoApplied}
                      className="shrink-0"
                    >
                      {promoApplied ? "Applied ✓" : "Apply"}
                    </Button>
                  </div>
                  {promoApplied && (
                    <p className="text-xs text-primary">Promo code applied! 10% discount.</p>
                  )}
                </div>

                <Link to="/checkout">
                  <Button className="w-full h-12 bg-gradient-accent text-accent-foreground font-semibold text-base hover:opacity-90 transition-opacity">
                    Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Trust */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Buyer Protection on every order</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Free shipping on orders over £2,000</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Secure payment via Stripe</span>
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

export default Cart;
