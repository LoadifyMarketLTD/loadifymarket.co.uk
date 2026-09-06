/**
 * MobileFavouritesPage — /profile/favourites
 * Saved-item collection for the native marketplace app.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import MobileBottomNav from '@/components/MobileBottomNav';

interface FavouriteItem {
  id: string;
  title: string;
  price: number;
  images: string[];
}

export default function MobileFavouritesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFavourites() {
      if (!user) {
        if (!cancelled) { setItems([]); setLoading(false); }
        return;
      }

      if (!cancelled) setLoading(true);

      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('productIds')
        .eq('userId', user.id)
        .maybeSingle();

      const productIds: string[] = (wishlist as { productIds?: string[] } | null)?.productIds ?? [];
      if (productIds.length === 0) {
        if (!cancelled) { setItems([]); setLoading(false); }
        return;
      }

      const { data: products } = await supabase
        .from('products')
        .select('id, title, price, images')
        .in('id', productIds)
        .eq('isActive', true);

      if (!cancelled) {
        setItems((products ?? []) as FavouriteItem[]);
        setLoading(false);
      }
    }

    void loadFavourites();
    return () => { cancelled = true; };
  }, [user]);

  const formatPrice = (price: number) => price.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#0A234F] md:hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <header className="sticky top-0 z-20 border-b border-[#0A234F]/[0.08] bg-white/95 px-[var(--mob-side,16px)] py-3" style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/profile')} aria-label="Back to profile" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0A234F]/10 bg-[#F7F9FC]">
            <ChevronLeft className="h-5 w-5 text-[#0A234F]" aria-hidden="true" />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C98200]">Saved</p>
            <h1 className="mt-0.5 text-[20px] font-black tracking-[-0.03em] text-[#0A234F]">Favourites</h1>
          </div>
        </div>
      </header>

      {!user ? (
        <div className="mx-[var(--mob-side,16px)] mt-5 flex flex-col items-center rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3D6]"><Heart className="h-7 w-7 text-[#C98200]" aria-hidden="true" /></div>
          <p className="mt-4 text-[15px] font-extrabold text-[#0A234F]">Keep your favourite finds together</p>
          <p className="mt-1 text-[12px] leading-[1.5] text-[#7A8493]">Sign in to view the items you have saved.</p>
          <button onClick={() => navigate('/login')} className="mt-5 h-11 rounded-[13px] bg-[#0A234F] px-6 text-[12px] font-extrabold text-white">Sign in</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 px-[var(--mob-side,16px)] pt-4">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[0.78] animate-pulse rounded-[16px] bg-[#E8EDF3]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mx-[var(--mob-side,16px)] mt-5 flex flex-col items-center rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2F7]"><Heart className="h-7 w-7 text-[#94A3B8]" aria-hidden="true" /></div>
          <p className="mt-4 text-[15px] font-extrabold text-[#0A234F]">No saved items yet</p>
          <p className="mt-1 max-w-[270px] text-[12px] leading-[1.5] text-[#7A8493]">Save useful listings and they will be waiting for you here.</p>
          <button onClick={() => navigate('/catalog')} className="mt-5 h-11 rounded-[13px] bg-[#0A234F] px-6 text-[12px] font-extrabold text-white">Browse marketplace</button>
        </div>
      ) : (
        <main className="grid grid-cols-2 gap-3 px-[var(--mob-side,16px)] py-4">
          {items.map((item) => (
            <Link key={item.id} to={`/product/${item.id}`} className="block overflow-hidden rounded-[16px] border border-[#0A234F]/[0.08] bg-white no-underline shadow-[0_6px_20px_rgba(10,35,79,0.06)]">
              <div className="relative aspect-square overflow-hidden bg-[#EEF2F7]">
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Heart className="h-6 w-6 text-[#A0A8B4]" aria-hidden="true" /></div>
                )}
                <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#C98200] shadow-sm" aria-hidden="true"><Heart className="h-4 w-4 fill-current" /></span>
                <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#0A234F] shadow-sm">{formatPrice(item.price)}</span>
              </div>
              <div className="px-2.5 pb-3 pt-2"><p className="line-clamp-2 text-[12px] font-semibold leading-[1.35] text-[#26354A]">{item.title}</p></div>
            </Link>
          ))}
        </main>
      )}

      <MobileBottomNav />
    </div>
  );
}
