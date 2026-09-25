export type LaunchMarket = "GB" | "RO";

export interface MarketLaunchDecision {
  market: LaunchMarket;
  status: "prelaunch" | "live" | "paused";
  catalogEnabled: boolean;
  checkoutEnabled: boolean;
  paymentEnabled: boolean;
}

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export async function readMarketLaunchDecision(
  admin: RpcClient,
  market: LaunchMarket,
): Promise<MarketLaunchDecision | null> {
  if (market === "GB") {
    return { market: "GB", status: "live", catalogEnabled: true, checkoutEnabled: true, paymentEnabled: true };
  }
  const { data, error } = await admin.rpc("server_market_launch_control_v1", { p_market_code: market });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    market,
    status: row.status === "live" ? "live" : row.status === "paused" ? "paused" : "prelaunch",
    catalogEnabled: row.catalogEnabled === true,
    checkoutEnabled: row.checkoutEnabled === true,
    paymentEnabled: row.paymentEnabled === true,
  };
}

export async function marketCheckoutIsLive(admin: RpcClient, market: LaunchMarket): Promise<boolean> {
  const decision = await readMarketLaunchDecision(admin, market);
  return Boolean(decision && decision.status === "live" && decision.checkoutEnabled);
}

export async function marketPaymentIsLive(admin: RpcClient, market: LaunchMarket): Promise<boolean> {
  const decision = await readMarketLaunchDecision(admin, market);
  return Boolean(decision && decision.status === "live" && decision.checkoutEnabled && decision.paymentEnabled);
}
