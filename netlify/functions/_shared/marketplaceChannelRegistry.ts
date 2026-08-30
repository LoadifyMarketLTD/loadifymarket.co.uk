import type { MarketplaceChannelCapability } from './marketplaceChannelConnector';

export const MARKETPLACE_CHANNEL_KEYS = [
  'channelengine',
  'linnworks',
  'sellbrite',
] as const;

export type MarketplaceChannelKey = (typeof MARKETPLACE_CHANNEL_KEYS)[number];

export type MarketplaceChannelCodeState =
  | 'scaffolded_unverified'
  | 'partner_access_required'
  | 'research_required';

export interface MarketplaceChannelDefinition {
  key: MarketplaceChannelKey;
  label: string;
  codeState: MarketplaceChannelCodeState;
  hostedActivation: 'off';
  verifiedCapabilities: readonly MarketplaceChannelCapability[];
  potentialCapabilities: readonly MarketplaceChannelCapability[];
  requiresPartnerApproval: boolean;
  notes: string;
}

const CHANNEL_TARGETS = [
  'product_content',
  'offers',
  'order_export',
  'shipments',
  'cancellations',
  'returns',
] as const satisfies readonly MarketplaceChannelCapability[];

const DEFINITIONS: Record<MarketplaceChannelKey, MarketplaceChannelDefinition> = {
  channelengine: {
    key: 'channelengine',
    label: 'ChannelEngine',
    codeState: 'scaffolded_unverified',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: CHANNEL_TARGETS,
    requiresPartnerApproval: true,
    notes: 'Channel API is a strong candidate for connecting external merchants to Loadify; no tenant/API key has been verified for Loadify yet.',
  },
  linnworks: {
    key: 'linnworks',
    label: 'Linnworks',
    codeState: 'partner_access_required',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: CHANNEL_TARGETS,
    requiresPartnerApproval: true,
    notes: 'Reserve as a seller-connectivity candidate; provider-specific marketplace/channel contract must be verified before implementation.',
  },
  sellbrite: {
    key: 'sellbrite',
    label: 'Sellbrite',
    codeState: 'research_required',
    hostedActivation: 'off',
    verifiedCapabilities: [],
    potentialCapabilities: ['product_content', 'offers', 'order_export', 'shipments'],
    requiresPartnerApproval: true,
    notes: 'Reserve as a future seller-connectivity candidate; do not assume a Loadify-compatible public marketplace API.',
  },
};

export function listMarketplaceChannelDefinitions(): readonly MarketplaceChannelDefinition[] {
  return MARKETPLACE_CHANNEL_KEYS.map(key => DEFINITIONS[key]);
}

export function getMarketplaceChannelDefinition(key: MarketplaceChannelKey): MarketplaceChannelDefinition {
  return DEFINITIONS[key];
}
