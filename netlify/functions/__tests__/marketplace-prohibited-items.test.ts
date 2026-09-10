import { describe, expect, it } from 'vitest';
import {
  getMarketplaceProhibitedItemViolation,
  marketplaceProhibitedItemResponseBody,
  MARKETPLACE_PROHIBITED_ITEMS_POLICY_VERSION,
} from '../_shared/marketplaceProhibitedItems';

const category = (
  title: string,
  description = '',
  specifications: Record<string, unknown> = {},
) => getMarketplaceProhibitedItemViolation({ title, description, specifications })?.category ?? null;

describe('marketplace prohibited-item classifier', () => {
  it('blocks dangerous products with high-confidence firearm/explosive signals', () => {
    expect(category('9mm ammunition box')).toBe('dangerous_weapons');
    expect(category('12 gauge shotgun')).toBe('dangerous_weapons');
    expect(category('9mm gun')).toBe('dangerous_weapons');
    expect(category('Fireworks selection pack')).toBe('dangerous_weapons');
    expect(category('50-round magazine')).toBe('dangerous_weapons');
  });

  it('blocks marijuana/THC and high-risk cannabinoid products', () => {
    expect(category('THC gummies')).toBe('marijuana_thc');
    expect(category('Cannabis flower')).toBe('marijuana_thc');
    expect(category('CBD oil 10%')).toBe('marijuana_thc');
  });

  it('blocks nicotine/tobacco and alcoholic beverages for the current Play v1 route', () => {
    expect(category('Nicotine pouches mint')).toBe('tobacco_nicotine');
    expect(category('Vape pen starter kit')).toBe('tobacco_nicotine');
    expect(category('Premium vodka 1L')).toBe('alcohol');
    expect(category('Red wine 750ml')).toBe('alcohol');
  });

  it('blocks prescription/controlled and unsafe health products', () => {
    expect(category('Diazepam tablets')).toBe('prescription_controlled_drugs');
    expect(category('Semaglutide injection pen')).toBe('prescription_controlled_drugs');
    expect(category('Ephedra slimming capsules')).toBe('unapproved_health_product');
    expect(category('Herbal drops', 'Cures cancer naturally')).toBe('unapproved_health_product');
  });

  it('blocks clear counterfeit, stolen, and recall signals', () => {
    expect(category('Counterfeit branded trainers')).toBe('counterfeit_stolen_recalled');
    expect(category('Phone', 'Stolen merchandise')).toBe('counterfeit_stolen_recalled');
    expect(category('Recalled product clearance')).toBe('counterfeit_stolen_recalled');
  });

  it('inspects nested seller-provided specifications', () => {
    expect(category('Gummies', '', { ingredients: { active: 'THC 5mg' } })).toBe('marijuana_thc');
  });

  it('does not block obvious legitimate lookalikes and accessories', () => {
    expect(category('Cordless glue gun kit')).toBeNull();
    expect(category('Kids water gun toy')).toBeNull();
    expect(category('Wine glass set of 6')).toBeNull();
    expect(category('Wine vinegar 500ml')).toBeNull();
    expect(category('Alcohol-free beer 0.0%')).toBeNull();
    expect(category('Non-alcoholic gin alternative')).toBeNull();
    expect(category('Cigar cutter stainless steel')).toBeNull();
    expect(category('Garden weed killer sprayer')).toBeNull();
    expect(category('Replica vintage car model')).toBeNull();
    expect(category('Authentic trainers', 'Original goods, not counterfeit')).toBeNull();
  });

  it('returns a stable seller-facing response without exposing classifier keywords', () => {
    const finding = getMarketplaceProhibitedItemViolation({ title: 'THC gummies' });
    expect(finding).not.toBeNull();
    const response = marketplaceProhibitedItemResponseBody(finding!);
    expect(response.code).toBe('PROHIBITED_ITEM');
    expect(response.policyVersion).toBe(MARKETPLACE_PROHIBITED_ITEMS_POLICY_VERSION);
    expect(response.error).toContain('Prohibited Items Policy');
    expect(response).not.toHaveProperty('category');
  });
});
