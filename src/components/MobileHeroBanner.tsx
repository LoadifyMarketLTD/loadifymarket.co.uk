// MobileHeroBanner.tsx

export default function MobileHeroBanner() {
  return (
    <div className="px-4 mt-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F0F14] to-[#1A1A22] p-5 flex items-center justify-between min-h-[200px] shadow-lg">

        {/* LEFT TEXT */}
        <div className="z-10 max-w-[55%]">
          <h1 className="text-[34px] leading-[38px] font-extrabold text-[#F5C76E]">
            0% COMMISSION
          </h1>

          <p className="text-white font-semibold mt-1">
            KEEP 100% OF YOUR SALE
          </p>

          <p className="text-gray-400 text-sm mt-1">
            Buy. Sell. Save more with Loadify.
          </p>

          <button className="mt-4 bg-gradient-to-r from-[#F5C76E] to-[#D4A94D] text-black font-semibold px-4 py-2 rounded-lg shadow-md">
            Start Selling
          </button>
        </div>

        {/* RIGHT IMAGE */}
        <div className="absolute right-2 bottom-0 w-[55%] h-full flex items-end justify-end pointer-events-none">
          <img
            src="/images/commission-0.png"
            alt="0% commission"
            className="h-[90%] object-contain drop-shadow-[0_0_25px_rgba(245,199,110,0.5)]"
          />
        </div>
      </div>

      {/* DOTS */}
      <div className="flex justify-center gap-2 mt-3">
        <div className="w-2 h-2 rounded-full bg-[#F5C76E]" />
        <div className="w-2 h-2 rounded-full bg-gray-500" />
        <div className="w-2 h-2 rounded-full bg-gray-500" />
      </div>
    </div>
  );
}
