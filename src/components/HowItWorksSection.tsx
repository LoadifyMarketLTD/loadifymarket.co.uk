import { CreditCard, PackageCheck, Search, Truck } from "lucide-react";

const buyerJourney = [
  { icon: Search, label: "Discover", detail: "Browse the products that are live on Loadify now." },
  { icon: CreditCard, label: "Checkout", detail: "Complete your purchase inside the Loadify checkout flow." },
  { icon: Truck, label: "Track", detail: "Follow order progress from your Loadify account." },
  { icon: PackageCheck, label: "Resolve", detail: "Keep order history and support connected in one place." },
];

const HowItWorksSection = () => (
  <section className="w-full overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-white shadow-[0_18px_50px_rgba(10,35,79,0.07)]" aria-label="How buying on Loadify works">
    <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr]">
      <div className="bg-[#F7F9FC] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">For buyers</p>
        <h2 className="mt-3 max-w-[470px] text-3xl font-black leading-[1.02] tracking-[-0.035em] text-[#0A234F] sm:text-4xl">
          Find it. Buy it. Follow it.
        </h2>
        <p className="mt-5 max-w-[460px] text-sm leading-6 text-[#64748B] sm:text-base sm:leading-7">
          Browse current listings, check out inside Loadify and keep your order journey visible from your account.
        </p>
      </div>

      <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {buyerJourney.map(({ icon: Icon, label, detail }, index) => {
            const isRightColumn = index % 2 === 1;
            const isBottomRow = index >= 2;
            return (
              <div
                key={label}
                className={[
                  "flex gap-4 border-b border-[#0A234F]/10 py-5 first:pt-0 last:border-b-0 sm:min-h-[132px] sm:px-6 sm:py-6 sm:first:pt-6",
                  isRightColumn ? "sm:border-r-0" : "sm:border-r",
                  isBottomRow ? "sm:border-b-0" : "sm:border-b",
                ].join(" ")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A234F] text-[#F5A300]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#0E3FA9]/55">0{index + 1}</p>
                  <p className="mt-1 text-base font-extrabold text-[#0A234F]">{label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-[#64748B]">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
