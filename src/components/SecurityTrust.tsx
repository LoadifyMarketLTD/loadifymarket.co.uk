import { FileCheck2, LockKeyhole, Radar, ShieldCheck } from "lucide-react";

const directions = [
  { icon: Radar, label: "Opportunity signals" },
  { icon: ShieldCheck, label: "Marketplace protection" },
  { icon: FileCheck2, label: "Decision evidence" },
];

export default function SecurityTrust() {
  return (
    <section className="relative w-full overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] px-6 py-7 text-white shadow-[0_22px_60px_rgba(10,35,79,0.17)] sm:px-8 sm:py-8 lg:px-10" aria-label="Loadify Intelligence direction">
      <div className="absolute inset-0 opacity-16" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />

      <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Loadify Intelligence</p>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/75">
              In development · not live-connected
            </span>
          </div>
          <h2 className="mt-3 max-w-[650px] text-2xl font-black leading-[1.04] tracking-[-0.03em] sm:text-3xl">
            Intelligence belongs behind the experience.
          </h2>
          <p className="mt-3 max-w-[650px] text-sm font-medium leading-6 text-white/75 sm:text-base sm:leading-7">
            Loadify Intelligence is being developed as a governed layer for opportunity signals, marketplace protection and decision evidence. It is not live-connected to Loadify Market yet.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {directions.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-[#F5A300]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-extrabold text-white/90">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <LockKeyhole className="h-5 w-5 shrink-0 text-[#F5A300]" aria-hidden="true" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/60">Permanent principle</p>
              <p className="mt-1 text-xs font-bold text-white/85">Evidence and policy before automated action.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
