import { BadgeCheck, LockKeyhole, Truck, Store } from 'lucide-react';

const items = [
  {
    icon: BadgeCheck,
    title: 'Seller Controls',
    body: 'Marketplace seller verification and approval controls.',
  },
  {
    icon: LockKeyhole,
    title: 'Secure Platform',
    body: 'Payments and account flows use the platform security stack.',
  },
  {
    icon: Truck,
    title: 'UK Delivery Ready',
    body: 'Built for UK marketplace fulfilment and delivery workflows.',
  },
  {
    icon: Store,
    title: 'Built for Sellers',
    body: 'A structured wholesale storefront ready for seller inventory.',
  },
];

export default function WholesaleTrustBand() {
  return (
    <section className="mx-auto mt-8 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10" aria-label="Loadify Market trust information">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E58D8] via-[#0750C7] to-[#062D77] px-5 py-5 text-white shadow-[0_18px_45px_rgba(10,35,79,0.18)] md:px-6 md:py-6">
        <div className="grid gap-5 md:grid-cols-[1.08fr_repeat(4,1fr)] md:items-center">
          <div className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3">
            <p className="text-[11px] font-semibold text-white/80">Operated by</p>
            <p className="mt-1 text-sm font-bold">XDrive Logistics Ltd</p>
            <p className="mt-1 text-[11px] leading-5 text-white/75">Co. No: 13171804</p>
            <p className="text-[11px] leading-5 text-white/75">VAT: GB 375949535</p>
          </div>

          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/10">
                <Icon className="h-5 w-5 text-cyan-300" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-white/72">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
