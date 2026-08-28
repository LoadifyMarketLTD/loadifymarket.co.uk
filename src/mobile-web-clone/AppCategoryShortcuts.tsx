import { Link, useLocation } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all', label: 'All', to: '/catalog', match: '' },
  { id: 'home', label: 'Home', to: '/category/homeware', match: '/category/homeware' },
  { id: 'electronics', label: 'Electronics', to: '/category/electrical', match: '/category/electrical' },
  { id: 'entertainment', label: 'Entertainment', to: '/category/entertainment', match: '/category/entertainment' },
  { id: 'hobbies', label: 'Hobbies & Collectables', to: '/category/toys', match: '/category/toys' },
  { id: 'sports', label: 'Sports', to: '/category/sports-fitness', match: '/category/sports-fitness' },
  { id: 'vehicles', label: 'Vehicles', to: '/category/vehicles', match: '/category/vehicles' },
  { id: 'fashion', label: 'Fashion', to: '/category/wholesale-clothing', match: '/category/wholesale-clothing' },
  { id: 'kids', label: 'Kids', to: '/category/kids', match: '/category/kids' },
] as const;

/** Browser-only visual clone of the installed app horizontal category pills. */
export default function AppCategoryShortcuts() {
  const { pathname } = useLocation();
  const activePill = pathname === '/' || pathname === '/catalog'
    ? 'all'
    : (CATEGORIES.find((category) => category.match && pathname.startsWith(category.match))?.id ?? '');

  return (
    <section aria-label="Browse by category" style={{ paddingTop: 12, paddingBottom: 4, background: '#07080B' }}>
      <div className="overflow-x-auto scrollbar-hide" style={{ paddingLeft: 'var(--mob-side,16px)', scrollPaddingInlineStart: 'var(--mob-side,16px)' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, to }) => {
            const active = id === activePill;
            return (
              <Link
                key={id}
                to={to}
                aria-label={`Browse ${label}`}
                style={{
                  textDecoration: 'none', display: 'flex', alignItems: 'center', height: 36, paddingLeft: 14, paddingRight: 14,
                  borderRadius: 9999,
                  background: active ? 'rgba(232,160,32,0.12)' : 'rgba(255,255,255,0.06)',
                  border: active ? '1.5px solid #E8A020' : '1px solid rgba(255,255,255,0.14)',
                  fontSize: 'clamp(13px,3.6vw,14px)', fontWeight: active ? 600 : 500,
                  color: active ? '#E8A020' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {label}
              </Link>
            );
          })}
          <div style={{ minWidth: 'var(--mob-side,16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
