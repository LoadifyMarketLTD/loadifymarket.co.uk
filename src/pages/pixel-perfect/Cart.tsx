import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { useCart } from "@/contexts/CartContext";

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useCart();

  // For 20% VAT on VAT-inclusive prices: VAT portion = gross / 6
  // (gross = net * 1.2, so VAT = gross - net = gross - gross/1.2 = gross/6)
  const vat = Math.round(subtotal / 6);
  const total = subtotal;

  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <main className="pt-28 pb-16">
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
    </MainLayout>
    );
  }

  return (
    <MainLayout>

      <main className="pt-28 pb-16">
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
                            <span className="text-xs text-primary font-medium">✓ Active</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-muted-foreground italic">Set by seller</span>
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
                  <span>Dispute support available</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <span>Delivery is set by the seller</span>
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

    </MainLayout>
  );
};

export default Cart;
