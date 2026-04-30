/**
 * MobileSearchBar — full-width search input for the mobile homepage.
 * Navigates to /catalog?q=<term> on submit, or /catalog if empty.
 * Mobile-only (parent hides it on md+).
 */

import { useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function MobileSearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 pt-3 pb-1"
      aria-label="Search marketplace"
    >
      <div
        className="flex items-center gap-3"
        style={{
          backgroundColor: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '13px 16px',
        }}
      >
        <Search
          style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search items, brands, or keywords..."
          aria-label="Search items, brands, or keywords"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
            lineHeight: 1.2,
          }}
        />
      </div>
    </form>
  );
}
