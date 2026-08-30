/**
 * WebMobileSearchOverlay — premium light search modal for mobile browser only.
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
  { label: 'Electronics', value: 'electronics' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Home', value: 'home-garden' },
  { label: 'Sports', value: 'sports' },
  { label: 'Toys', value: 'toys-games' },
  { label: 'Tools', value: 'diy-tools' },
  { label: 'All', value: '' },
];

interface Props {
  onClose: () => void;
}

export default function WebMobileSearchOverlay({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search marketplace"
      className="bg-[#F8F7F4] text-[#0A234F]"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px 14px' }}>
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-[0_3px_12px_rgba(15,23,42,0.035)]"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid rgba(10,35,79,0.10)',
            borderRadius: '10px',
            padding: '13px 14px',
          }}
        >
          <Search style={{ width: '18px', height: '18px', flexShrink: 0 }} className="text-[#64748B]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search items, brands, keywords…"
            aria-label="Search items, brands, keywords"
            className="text-[#0A234F] placeholder:text-[#8A94A3]"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
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
          className="bg-white text-[#475569]"
          style={{
            width: '44px',
            height: '44px',
            flexShrink: 0,
            border: '1px solid rgba(10,35,79,0.10)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X style={{ width: '18px', height: '18px' }} aria-hidden="true" />
        </button>
      </div>

      <div className="border-t border-[#0A234F]/[0.06]" style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: '22px' }}>
        <p className="text-[#6B7280]" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Browse categories
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} role="list" aria-label="Quick category shortcuts">
          {QUICK_CATEGORIES.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              role="listitem"
              onClick={() => handleCategory(value)}
              className="bg-white text-[#334155]"
              style={{
                minHeight: '42px',
                padding: '0 15px',
                borderRadius: '8px',
                border: '1px solid rgba(10,35,79,0.10)',
                fontSize: '13px',
                fontWeight: 500,
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
