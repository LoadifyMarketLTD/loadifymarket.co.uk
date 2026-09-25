import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MARKET_CONFIG, writeMarket, type MarketCode, type MarketConfig } from '@/lib/marketConfig';
import { resolveInitialMarket } from '@/lib/marketResolver';
import i18n from '@/i18n';

interface MarketContextValue {
  market: MarketCode;
  config: MarketConfig;
  setMarket: (market: MarketCode) => void;
}

interface RuntimeLaunchDecision {
  market: MarketCode;
  status: 'live' | 'prelaunch' | 'paused';
  catalogEnabled: boolean;
  checkoutEnabled: boolean;
  paymentEnabled: boolean;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState<MarketCode>(() => resolveInitialMarket());
  const [launchDecision, setLaunchDecision] = useState<RuntimeLaunchDecision | null>(null);

  useEffect(() => {
    if (market !== 'RO') return;
    let active = true;
    void fetch('/.netlify/functions/market-launch-status?market=RO', { headers: { Accept: 'application/json' } })
      .then(async (response) => response.ok ? response.json() as Promise<RuntimeLaunchDecision> : null)
      .then((decision) => {
        if (active && decision?.market === 'RO') setLaunchDecision(decision);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [market]);

  useEffect(() => {
    const language = MARKET_CONFIG[market].language;
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [market]);

  const setMarket = (next: MarketCode) => {
    writeMarket(next);
    setMarketState(next);
  };

  const config = useMemo<MarketConfig>(() => {
    const base = MARKET_CONFIG[market];
    if (market !== 'RO' || launchDecision?.market !== 'RO') return base;
    const live = launchDecision.status === 'live';
    return {
      ...base,
      status: live ? 'live' : 'prelaunch',
      catalogEnabled: launchDecision.catalogEnabled,
      checkoutEnabled: live && launchDecision.checkoutEnabled && launchDecision.paymentEnabled,
    };
  }, [market, launchDecision]);

  const value = useMemo(() => ({ market, config, setMarket }), [market, config]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMarket(): MarketContextValue {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used within MarketProvider');
  return value;
}
