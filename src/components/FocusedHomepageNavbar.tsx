import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, X } from 'lucide-react';
import logo from '@/assets/loadify-logo.svg';
import { useCart } from '@/contexts/CartContext';

export default function FocusedHomepageNavbar() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src={logo} alt="Loadify Market" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-slate-900">Loadify <span className="text-blue-700">Market</span></span>
        </Link>

        <form onSubmit={submit} className="hidden max-w-sm flex-1 lg:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white" />
          </div>
        </form>

        <div className="hidden items-center gap-6 lg:flex">
          <Link to="/catalog" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Catalog</Link>
          <Link to="/deals" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Deals</Link>
          <a href="#categories" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Categories</a>
          <Link to="/contact" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Contact</Link>
          <Link to="/about" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">About</Link>
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link to="/cart" className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
          </Link>
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Sign In</Link>
          <Link to="/register?type=seller" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800">Get Started</Link>
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-slate-800 lg:hidden" aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <form onSubmit={submit} className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none" />
            </div>
          </form>
          <div className="space-y-1">
            <Link to="/catalog" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700">Catalog</Link>
            <Link to="/deals" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700">Deals</Link>
            <a href="#categories" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700">Categories</a>
            <Link to="/contact" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700">Contact</Link>
            <Link to="/about" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700">About</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
            <Link to="/login" className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-800">Sign In</Link>
            <Link to="/register?type=seller" className="rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-bold text-white">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
