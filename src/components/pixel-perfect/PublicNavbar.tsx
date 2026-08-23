import { Menu, X, Search, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value) navigate(`/catalog?q=${encodeURIComponent(value)}`);
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground">Loadify <span className="text-primary">Market</span></span>
        </Link>

        <form onSubmit={submitSearch} className="hidden w-48 lg:block xl:w-72" role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search marketplace..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </form>

        <div className="hidden items-center gap-6 lg:flex">
          <Link to="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground">Catalog</Link>
          <Link to="/deals" className="text-sm font-medium text-muted-foreground hover:text-foreground">Deals</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">Contact</Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
          <Link to="/register" className="rounded-lg bg-gradient-hero px-4 py-2 text-sm font-semibold text-primary-foreground">Get Started</Link>
          <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-foreground" aria-label="Shopping cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{cartCount}</span>}
          </Link>
        </div>

        <button onClick={() => setMobileOpen((value) => !value)} className="p-2 text-foreground lg:hidden" aria-label="Toggle menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="space-y-3 border-b border-border bg-card px-4 py-4 lg:hidden">
          <Link to="/catalog" className="block text-sm font-medium text-muted-foreground">Catalog</Link>
          <Link to="/deals" className="block text-sm font-medium text-muted-foreground">Deals</Link>
          <Link to="/contact" className="block text-sm font-medium text-muted-foreground">Contact</Link>
          <Link to="/about" className="block text-sm font-medium text-muted-foreground">About</Link>
          <Link to="/login" className="block text-sm font-medium text-muted-foreground">Sign In</Link>
          <Link to="/register" className="block text-sm font-semibold text-primary">Get Started</Link>
        </div>
      )}
    </nav>
  );
}
