/**
 * MobileFavouritesPage — /profile/favourites
 *
 * Mobile presentation of the same wishlist state used by Buyer Wishlist.
 * Saved products are not silently filtered out merely because their current
 * listing state changed; when readable under RLS they remain visible as
 * unavailable and can be removed from the wishlist.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import MobileBottomNav from '@/components/MobileBottomNav';

interface FavouriteItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  isActive: boolean;
}

export default function MobileFavouritesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
        .select('id, title, price, images, isActive')
        .in('id', productIds);

      if (!cancelled) {
        setItems((products ?? []) as FavouriteItem[]);
        setLoading(false);
      }
    }

    void loadFavourites();
    return () => { cancelled = true; };
  }, [user]);

  const removeFavourite = async (productId: string) => {
    if (!user?.id || removingId) return;
    setRemovingId(productId);

    const nextItems = items.filter((item) => item.id !== productId);
    const nextIds = nextItems.map((item) => item.id);

    const { error } = await supabase
      .from('wishlists')
      .update({ productIds: nextIds, updatedAt: new Date().toISOString() })
      .eq('userId', user.id);

    if (!error) setItems(nextItems);
    setRemovingId(null);
  };

  const formatPrice = (price: number) =>
    price.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
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
          <p className="text-[15px] text-muted-foreground m-0">Sign in to see your saved items.</p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold"
            style={{ height: 44, paddingInline: 32, borderRadius: 9999, border: 'none', cursor: 'pointer' }}
          >
            Sign in
          </button>
        </div>
      ) : loading ? (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white/[0.05]" style={{ borderRadius: 12, height: 200 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
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
          <p className="text-sm text-muted-foreground m-0">Tap the heart on any listing to save it here.</p>
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
            <div
              key={item.id}
              className="bg-white/[0.04]"
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                position: 'relative',
              }}
            >
              <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="bg-white/[0.06]" style={{ aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.isActive ? 1 : 0.55 }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart className="text-foreground/15" style={{ width: 24, height: 24 }} aria-hidden="true" />
                    </div>
                  )}
                  {!item.isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        borderRadius: 999,
                        padding: '4px 7px',
                        fontSize: 9,
                        fontWeight: 800,
                        background: 'rgba(15,23,42,0.82)',
                        color: '#fff',
                      }}
                    >
                      UNAVAILABLE
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 10px 8px' }}>
                  <p className="text-[13px] font-medium text-foreground/85 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.title}
                  </p>
                  <p className="text-sm font-bold m-0" style={{ marginTop: 4 }}>{formatPrice(item.price)}</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => { void removeFavourite(item.id); }}
                disabled={removingId === item.id}
                aria-label={`Remove ${item.title} from favourites`}
                className="text-danger"
                style={{
                  width: '100%',
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'transparent',
                  cursor: removingId === item.id ? 'wait' : 'pointer',
                  opacity: removingId === item.id ? 0.55 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
