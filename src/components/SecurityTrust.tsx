import { Eye, FileCheck2, LockKeyhole, Radar, ShieldCheck, Sparkles } from "lucide-react";

const loop = ["Observe", "Understand", "Decide", "Protect", "Act", "Learn"];

const outcomeTerritories = [
  {
    icon: Radar,
    title: "Opportunity signals",
    description: "The Intelligence platform is being designed to surface demand, catalogue and commercial signals as recommendations — not automatic truth.",
  },
  {
    icon: ShieldCheck,
    title: "Marketplace protection",
    description: "Fraud, fake-review and coordinated-abuse concepts sit inside a broader Marketplace Immune System direction, under evidence and policy controls.",
  },
  {
    icon: FileCheck2,
    title: "Decision evidence",
    description: "The direction is to preserve why important decisions were made, not only what changed, so automation remains explainable and governed.",
  },
];

export default function SecurityTrust() {
  return (
    <section
      className="relative w-full overflow-hidden rounded-[32px] bg-[#071B3A] px-6 py-9 text-white shadow-[0_24px_70px_rgba(7,27,58,0.18)] sm:px-8 sm:py-11 lg:px-10 lg:py-12"
      aria-label="Loadify Intelligence and trust direction"
    >
      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1D57D8]/20 blur-3xl" aria-hidden="true" />

      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[760px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Intelligence, not AI theatre</p>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/70">
                In development · not live-connected
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-black leading-[1.02] tracking-[-0.035em] sm:text-4xl lg:text-[2.7rem]">
              Intelligence should make commerce safer and smarter — not noisier.
            </h2>
            <p className="mt-4 max-w-[720px] text-sm font-medium leading-6 text-white/68 sm:text-base sm:leading-7">
              Loadify Intelligence is being developed separately as a governed intelligence and control layer. It is not yet connected live to Loadify Market, so this preview shows the product direction without pretending future automation is already active.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
            <LockKeyhole className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/45">Permanent rule</p>
              <p className="mt-1 text-xs font-bold text-white/90">Evidence + policy before action</p>
            </div>
          </div>
        </div>

        <div className="mt-9 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">The control loop</p>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
            <div className="absolute left-[8%] right-[8%] top-5 hidden h-px bg-white/12 lg:block" aria-hidden="true" />
            {loop.map((label, index) => (
              <div key={label} className="relative z-10 flex items-center gap-3 lg:block lg:text-center">
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    index === 3
                      ? "border-[#F5A300]/50 bg-[#F5A300] text-[#0A234F]"
                      : "border-white/15 bg-[#071B3A] text-white/80",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-black">0{index + 1}</span>
                </div>
                <p className="text-[11px] font-extrabold text-white/85 lg:mt-2.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {outcomeTerritories.map(({ icon: Icon, title, description }) => (
            <div key={title} className="py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <Icon className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
              <p className="mt-3 text-base font-extrabold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-white/[0.05] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
            <p className="max-w-[760px] text-xs font-semibold leading-5 text-white/72 sm:text-sm">
              No black-box “AI does everything” claim. No fake automation. Public wording moves to present tense only after the relevant Intelligence capability is integrated and production-evidenced.
            </p>
          </div>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-white/40">Current-truth state</span>
        </div>
      </div>
    </section>
  );
}
