export const MARKETPLACE_CHANNEL_CONNECTOR_INTERFACE_VERSION = 1 as const;

export type MarketplaceChannelCapability =
  | 'product_content'
  | 'offers'
  | 'order_export'
  | 'shipments'
  | 'cancellations'
  | 'returns';

export type MarketplaceChannelErrorClass =
  | 'AUTH_CONFIGURATION_FAILURE'
  | 'RATE_LIMITED'
  | 'RETRYABLE_FAILURE'
  | 'PERMANENT_REJECTION'
  | 'UNKNOWN_OUTCOME'
  | 'MALFORMED_RESPONSE'
  | 'CAPABILITY_UNAVAILABLE';

export type MarketplaceChannelResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorClass: MarketplaceChannelErrorClass; message: string; retryAfterMs?: number };

export interface MarketplaceChannelContext {
  correlationId: string;
  channelKey: string;
  territory: string;
}

/**
 * Boundary for external systems that connect merchants/sellers to Loadify as a
 * marketplace channel. This is intentionally separate from SupplierAdapterV1:
 * supplier networks source/fulfill goods, while channel connectors synchronize
 * third-party merchants into the Loadify marketplace.
 */
export interface MarketplaceChannelConnectorV1 {
  readonly interfaceVersion: typeof MARKETPLACE_CHANNEL_CONNECTOR_INTERFACE_VERSION;
  readonly connectorKey: string;
  readonly connectorVersion: string;
  readonly capabilities: readonly MarketplaceChannelCapability[];

  pullProductContent?(context: MarketplaceChannelContext): Promise<MarketplaceChannelResult<unknown[]>>;
  pullOffers?(context: MarketplaceChannelContext): Promise<MarketplaceChannelResult<unknown[]>>;
  pushOrders?(context: MarketplaceChannelContext, orders: unknown[]): Promise<MarketplaceChannelResult<{ accepted: number }>>;
  pullShipments?(context: MarketplaceChannelContext): Promise<MarketplaceChannelResult<unknown[]>>;
  pushCancellations?(context: MarketplaceChannelContext, cancellations: unknown[]): Promise<MarketplaceChannelResult<{ accepted: number }>>;
  pushReturns?(context: MarketplaceChannelContext, returns: unknown[]): Promise<MarketplaceChannelResult<{ accepted: number }>>;
}

export function assertMarketplaceChannelConnectorV1(connector: MarketplaceChannelConnectorV1): void {
  if (connector.interfaceVersion !== MARKETPLACE_CHANNEL_CONNECTOR_INTERFACE_VERSION) {
    throw new Error(`Unsupported marketplace channel connector interface version: ${connector.interfaceVersion}`);
  }
  if (!connector.connectorKey.trim() || !connector.connectorVersion.trim()) {
    throw new Error('Marketplace channel connectorKey and connectorVersion are required');
  }
  if (new Set(connector.capabilities).size !== connector.capabilities.length) {
    throw new Error('Marketplace channel connector capabilities must be unique');
  }
}
