/**
 * MobileSearchOverlay — full-screen dark search modal.
 *
 * Shown when the user taps the Search icon in MobileAppHeader.
 * Includes:
 *   • text input with auto-focus
 *   • close (✕) button
 *   • quick-category chips that navigate to /catalog?category=X
 */

import { useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface Category {
  label: string;
  value: string;
}

const QUICK_CATEGORIES: Category[] = [
  { label: 'Electronics',  value: 'electronics' },
  { label: 'Clothing',     value: 'clothing' },
  { label: 'Automotive',   value: 'automotive' },
  { label: 'Home',         value: 'home-garden' },
  { label: 'Sports',       value: 'sports' },
  { label: 'Toys',         value: 'toys-games' },
  { label: 'Tools',        value: 'diy-tools' },
  { label: 'All',          value: '' },
];

interface Props {
  onClose: () => void;
}

export default function MobileSearchOverlay({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus the input when the overlay opens.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    onClose();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
  };

  const handleCategory = (value: string) => {
    onClose();
    navigate(value ? `/catalog?category=${encodeURIComponent(value)}` : '/catalog');
  };

  return (
    /* Full-screen backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search marketplace"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(7,8,11,0.97)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ── Top bar: input + close ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px 12px' }}>
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
            background: '#1A1A24', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '14px', padding: '13px 16px' }}
        >
          <Search
            style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search items, brands, keywords…"
            aria-label="Search items, brands, keywords"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '15px',
              lineHeight: 1.2,
              minWidth: 0,
            }}
          />
        </form>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          style={{
            width: '44px', height: '44px', flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.70)' }} aria-hidden="true" />
        </button>
      </div>

      {/* ── Quick category chips ────────────────────────────── */}
      <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.40)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Browse categories
        </p>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
          role="list"
          aria-label="Quick category shortcuts"
        >
          {QUICK_CATEGORIES.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              role="listitem"
              onClick={() => handleCategory(value)}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                borderRadius: '22px',
                background: 'rgba(245,185,66,0.08)',
                border: '1px solid rgba(200,134,10,0.35)',
                color: '#F5B942',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
