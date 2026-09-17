import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function MobileAccountToolShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#EEF3F8] text-[#0A234F] md:hidden" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
      <header className="sticky top-0 z-40 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]" style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-3 px-[var(--mob-side,16px)] pb-4 pt-2">
          <button type="button" onClick={() => navigate('/profile')} aria-label="Back to profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p>
            <h1 className="m-0 mt-0.5 text-[22px] font-black tracking-[-0.03em] text-white">{title}</h1>
            {subtitle ? <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[900px] [&>div]:!max-w-none [&>div]:!p-4">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
