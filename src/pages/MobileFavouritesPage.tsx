/**
 * MobileFavouritesPage — /profile/favourites
 *
 * Shows saved (wishlisted) items for all logged-in users.
 * Guests see a sign-in prompt.
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

  const formatPrice = (p: number) =>
    p.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <button
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Favourite Items</h1>
      </div>

      {!user ? (
        /* Guest state */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 48,
            paddingInline: 'var(--mob-side, 16px)',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <Heart className="text-foreground/20" style={{ width: 40, height: 40 }} aria-hidden="true" />
          <p className="text-[15px] text-muted-foreground m-0">
            Sign in to see your saved items.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold"
            style={{
              height: 44,
              paddingInline: 32,
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      ) : loading ? (
        /* Loading skeleton */
        <div style={{ paddingInline: 'var(--mob-side, 16px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.05]"
              style={{ borderRadius: 12, height: 200 }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 48,
            gap: 12,
            textAlign: 'center',
            paddingInline: 'var(--mob-side, 16px)',
          }}
        >
          <Heart className="text-foreground/20" style={{ width: 40, height: 40 }} aria-hidden="true" />
          <p className="text-base font-bold text-foreground m-0">No saved items yet</p>
          <p className="text-sm text-muted-foreground m-0">
            Tap the heart on any listing to save it here.
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="text-sm font-semibold text-foreground/80 bg-white/[0.07]"
            style={{
              height: 44,
              paddingInline: 28,
              borderRadius: 9999,
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            Browse listings
          </button>
        </div>
      ) : (
        /* Items grid */
        <div
          style={{
            paddingInline: 'var(--mob-side, 16px)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 8,
          }}
        >
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/products/${item.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                className="bg-white/[0.04]"
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Image */}
                <div className="bg-white/[0.06]" style={{ aspectRatio: '1', overflow: 'hidden' }}>
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart className="text-foreground/15" style={{ width: 24, height: 24 }} aria-hidden="true" />
                    </div>
                  )}
                </div>
                {/* Details */}
                <div style={{ padding: '10px 10px 12px' }}>
                  <p
                    className="text-[13px] font-medium text-foreground/85 m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {item.title}
                  </p>
                  <p className="text-sm font-bold m-0" style={{ marginTop: '4px' }}>
                    {formatPrice(item.price)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
