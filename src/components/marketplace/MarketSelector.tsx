import { MARKET_CONFIG, type MarketCode } from '@/lib/marketConfig';
import { useMarket } from '@/contexts/MarketContext';

export default function MarketSelector() {
  const { market, setMarket } = useMarket();

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Country and market</span>
      <select
        aria-label="Country and market"
        value={market}
        onChange={(event) => setMarket(event.target.value as MarketCode)}
        className="h-9 rounded-md border border-white/15 bg-white/[0.08] px-2 text-[12px] font-semibold text-white outline-none hover:bg-white/[0.12] focus:border-white/35"
      >
        {(Object.keys(MARKET_CONFIG) as MarketCode[]).map((code) => {
          const item = MARKET_CONFIG[code];
          return <option key={code} value={code} className="text-slate-900">{item.flag} {item.shortLabel} · {item.currency}</option>;
        })}
      </select>
    </label>
  );
}
