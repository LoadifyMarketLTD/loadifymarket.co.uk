import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MARKET_CONFIG, readMarket, writeMarket, type MarketCode, type MarketConfig } from '@/lib/marketConfig';

interface MarketContextValue {
  market: MarketCode;
  config: MarketConfig;
  setMarket: (market: MarketCode) => void;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState<MarketCode>(() => readMarket());

  useEffect(() => {
    document.documentElement.lang = MARKET_CONFIG[market].language;
  }, [market]);

  const setMarket = (next: MarketCode) => {
    writeMarket(next);
    setMarketState(next);
  };

  const value = useMemo(() => ({ market, config: MARKET_CONFIG[market], setMarket }), [market]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMarket(): MarketContextValue {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used within MarketProvider');
  return value;
}
