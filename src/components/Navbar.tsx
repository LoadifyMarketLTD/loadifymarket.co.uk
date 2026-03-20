import { Menu, X, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/loadify-logo.png";
import NavbarSearch from "@/components/NavbarSearch";
import { useCart } from "@/contexts/CartContext";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Loadify Market" className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
            Loadify <span className="text-primary">Market</span>
          </span>
        </div>

        {/* Desktop search */}
        <NavbarSearch className="hidden lg:block w-48 xl:w-72 2xl:w-96" />

        <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          <Link to="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Catalog</Link>
          <Link to="/clearance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Deals</Link>
          <Link to="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Categories</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
                {cartCount}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
          <Button size="sm" className="bg-gradient-hero text-primary-foreground" asChild><Link to="/signup">Get Started</Link></Button>
        </div>

        {/* Mobile/tablet buttons */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            className="text-foreground p-2"
            onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileOpen(false); }}
          >
            <Search size={20} />
          </button>
          <button
            className="text-foreground p-2"
            onClick={() => { setMobileOpen(!mobileOpen); setMobileSearchOpen(false); }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {mobileSearchOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-3">
          <NavbarSearch className="w-full" onSelect={() => setMobileSearchOpen(false)} />
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-4 space-y-3">
          <Link to="/catalog" className="block text-sm font-medium text-muted-foreground">Catalog</Link>
          <Link to="/clearance" className="block text-sm font-medium text-muted-foreground">Deals</Link>
          <Link to="/catalog" className="block text-sm font-medium text-muted-foreground">Categories</Link>
          <Link to="/contact" className="block text-sm font-medium text-muted-foreground">Contact</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" className="flex-1" asChild><Link to="/login">Sign In</Link></Button>
            <Button size="sm" className="flex-1 bg-gradient-hero text-primary-foreground" asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
