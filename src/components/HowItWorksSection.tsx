import { ArrowRight, Boxes, CreditCard, PackageCheck, Search, Store, Truck } from "lucide-react";

const buyerJourney = [
  { icon: Search, label: "Discover", detail: "Browse real marketplace products and categories." },
  { icon: CreditCard, label: "Checkout", detail: "Complete payment inside the Loadify purchase flow." },
  { icon: Truck, label: "Track", detail: "Follow order progress from your buyer account." },
  { icon: PackageCheck, label: "Resolve", detail: "Keep order history and support paths connected to the same account." },
];

const operatingLayers = [
  {
    icon: Store,
    label: "Marketplace sellers",
    detail: "Third-party sellers trade through the marketplace with their own seller identity and seller workflow.",
  },
  {
    icon: Boxes,
    label: "Loadify commerce modes",
    detail: "The platform architecture is designed to add governed Loadify-operated sourcing and supplier fulfilment without creating a second buyer journey.",
  },
  {
    icon: PackageCheck,
    label: "One customer experience",
    detail: "Product, checkout, order visibility and support remain Loadify-facing instead of fragmenting into disconnected systems.",
  },
];

const HowItWorksSection = () => (
  <section
    className="w-full overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#F7F9FC]"
    aria-label="How the Loadify commerce journey works"
  >
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">One customer journey</p>
        <h2 className="mt-2 max-w-[650px] text-3xl font-black leading-[1.02] tracking-[-0.035em] text-[#0A234F] sm:text-4xl">
          Commerce should feel connected, even when the systems behind it are complex.
        </h2>
        <p className="mt-4 max-w-[650px] text-sm leading-6 text-[#64748B] sm:text-base sm:leading-7">
          Buyers should not need to understand payment architecture, fulfilment legs or internal platform controls. They should understand what to buy, how to pay and where their order is.
        </p>

        <div className="relative mt-8">
          <div className="absolute bottom-6 left-5 top-6 w-px bg-[#0A234F]/10 sm:bottom-auto sm:left-6 sm:right-6 sm:top-5 sm:h-px sm:w-auto" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 sm:gap-4">
            {buyerJourney.map(({ icon: Icon, label, detail }, index) => (
              <div key={label} className="relative grid grid-cols-[44px_1fr] items-start gap-4 sm:block">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#F7F9FC] bg-[#0A234F] text-[#F5A300] sm:h-11 sm:w-11">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="sm:mt-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#0E3FA9]/60">0{index + 1}</p>
                  <p className="mt-1 text-sm font-extrabold text-[#0A234F]">{label}</p>
                  <p className="mt-1.5 text-xs leading-5 text-[#64748B]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B57500]">Behind the storefront</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#0A234F] sm:text-3xl">More ways to operate. One Loadify experience.</h3>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5DF] text-[#B57500] sm:flex">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-7 divide-y divide-[#0A234F]/10 border-y border-[#0A234F]/10">
          {operatingLayers.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F6FF] text-[#0E3FA9]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#0A234F]">{label}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#64748B] sm:text-sm sm:leading-6">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 border-l-4 border-[#F5A300] bg-[#FFF9ED] px-4 py-4">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#B57500]" aria-hidden="true" />
          <p className="text-xs font-semibold leading-5 text-[#5F4A1A]">
            Supplier-Fulfilled commerce is presented here as platform direction and controlled capability — not as a claim that live supplier relationships or supplier traffic are already active.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
