/**
 * MobileCategoryShortcuts — Vinted-style horizontal pill row.
 *
 * Text-only pill chips, no images. The active pill (matched by current
 * pathname or "All" on the home page) gets a gold border highlight.
 */

import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

interface Category {
  id: string;
  label: string;
  to: string;
  match: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',           label: 'All',                    to: '/catalog',                    match: '' },
  { id: 'home',          label: 'Home',                   to: '/category/homeware',          match: '/category/homeware' },
  { id: 'electronics',   label: 'Electronics',            to: '/category/electrical',        match: '/category/electrical' },
  { id: 'entertainment', label: 'Entertainment',          to: '/category/entertainment',     match: '/category/entertainment' },
  { id: 'hobbies',       label: 'Hobbies & Collectables', to: '/category/toys',              match: '/category/toys' },
  { id: 'sports',        label: 'Sports',                 to: '/category/sports-fitness',    match: '/category/sports-fitness' },
  { id: 'vehicles',      label: 'Vehicles',               to: '/category/vehicles',          match: '/category/vehicles' },
  { id: 'fashion',       label: 'Fashion',                to: '/category/wholesale-clothing',match: '/category/wholesale-clothing' },
  { id: 'kids',          label: 'Kids',                   to: '/category/kids',              match: '/category/kids' },
];

export default function MobileCategoryShortcuts() {
  const { pathname } = useLocation();

  const activePill =
    pathname === '/' || pathname === '/catalog'
      ? 'all'
      : (CATEGORIES.find(c => c.match && pathname.startsWith(c.match))?.id ?? '');

  return (
    <section
      aria-label="Browse by category"
      style={{ paddingTop: 12, paddingBottom: 4 }}
    >
      <div
        className="overflow-x-auto scrollbar-hide"
        style={{
          paddingLeft: 'var(--mob-side, 16px)',
          scrollPaddingInlineStart: 'var(--mob-side, 16px)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, to }) => {
            const active = id === activePill;
            return (
              <Link
                key={id}
                to={to}
                aria-label={`Browse ${label}`}
                className={`${active ? 'bg-[#F5A300]/[0.13] border-[#F5A300] text-[#8A5A00] font-semibold' : 'bg-white border-[#0A234F]/15 text-[#0A234F]/85 font-medium'}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  height: 36,
                  paddingLeft: 14,
                  paddingRight: 14,
                  borderRadius: 9999,
                  borderWidth: active ? '1.5px' : '1px',
                  borderStyle: 'solid',
                  fontSize: 'clamp(13px, 3.6vw, 14px)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'border-color 0.15s, color 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
