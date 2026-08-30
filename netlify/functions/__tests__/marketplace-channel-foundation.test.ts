import { describe, expect, it } from 'vitest';
import {
  getMarketplaceChannelDefinition,
  listMarketplaceChannelDefinitions,
} from '../_shared/marketplaceChannelRegistry';


describe('marketplace channel registry', () => {
  it('keeps all external seller-connectivity channels hosted-off', () => {
    expect(listMarketplaceChannelDefinitions().every(channel => channel.hostedActivation === 'off')).toBe(true);
    expect(listMarketplaceChannelDefinitions().every(channel => channel.verifiedCapabilities.length === 0)).toBe(true);
  });

  it('reserves ChannelEngine behind the separate marketplace-channel boundary', () => {
    const channel = getMarketplaceChannelDefinition('channelengine');
    expect(channel.codeState).toBe('scaffolded_unverified');
    expect(channel.potentialCapabilities).toEqual([
      'product_content',
      'offers',
      'order_export',
      'shipments',
      'cancellations',
      'returns',
    ]);
    expect(channel.requiresPartnerApproval).toBe(true);
  });

  it('does not claim verified Linnworks or Sellbrite capabilities', () => {
    expect(getMarketplaceChannelDefinition('linnworks').verifiedCapabilities).toEqual([]);
    expect(getMarketplaceChannelDefinition('sellbrite').verifiedCapabilities).toEqual([]);
  });
});
