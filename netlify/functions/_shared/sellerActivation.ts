/**
 * Shared seller auto-activation helper.
 *
 * A seller's account becomes ACTIVE only when ALL of the following are true:
 *   1. Their role is 'seller'
 *   2. Profile is complete: business/store name + phone + address postcode
 *   3. Stripe Connect account exists (stripeAccountId present)
 *   4. Stripe account is fully ready: stripeConnectStatus = 'active'
 *      (which maps to charges_enabled=true AND payouts_enabled=true)
 *   5. sellerStatus is NOT 'suspended' (admin suspension is sticky)
 *
 * Stripe is used as a technical readiness signal only.
 * It is NOT used for identity verification or as a compliance claim.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SellerProfileSnapshot {
  userId: string;
  sellerStatus: string;
  activatedAt?: string | null;
  storeName?: string | null;
  businessName?: string | null;
  contactPhone?: string | null;
  businessAddress?: { postcode?: string } | null;
  stripeAccountId?: string | null;
  stripeConnectStatus?: string | null;
}

/**
 * Returns true when the minimum required profile fields are present.
 * Required: a business/store name, a contact phone, and an address postcode.
 */
export function isProfileComplete(
  profile: Pick<
    SellerProfileSnapshot,
    'storeName' | 'businessName' | 'contactPhone' | 'businessAddress'
  >,
): boolean {
  const name = (profile.storeName ?? profile.businessName ?? '').trim();
  const phone = (profile.contactPhone ?? '').trim();
  const postcode = (
    (profile.businessAddress as { postcode?: string } | null)?.postcode ?? ''
  ).trim();
  return name.length > 0 && phone.length > 0 && postcode.length > 0;
}

/**
 * Derives the canonical seller status from the current state.
 * 'suspended' is sticky — only admin can lift it.
 */
export function deriveSellerStatus(
  currentStatus: string,
  profileComplete: boolean,
  stripeActive: boolean,
): 'draft' | 'submitted' | 'active' | 'suspended' {
  if (currentStatus === 'suspended') return 'suspended';
  if (profileComplete && stripeActive) return 'active';
  if (profileComplete) return 'submitted';
  return 'draft';
}

export interface ActivationResult {
  sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended';
  profileComplete: boolean;
  /** true if the seller has a stripeAccountId (connected, not necessarily fully active) */
  stripeConnected: boolean;
  stripeActive: boolean;
  /** true if sellerStatus was updated in this call */
  changed: boolean;
  /**
   * true if this call is the FIRST time this seller reached 'active' status
   * (activatedAt was null before this update). Use this — not just `changed` —
   * to gate admin notification emails, preventing duplicate sends when both the
   * Stripe webhook and a connect-status poll fire around the same time.
   */
  firstActivation: boolean;
}

/**
 * Checks all activation conditions for a seller and updates
 * seller_profiles.sellerStatus if the derived status differs from the stored one.
 *
 * Safe to call multiple times — only writes to the DB when the status changes.
 * Returns null if the seller profile cannot be found.
 *
 * @param liveStripeConnectStatus - When provided, this live value is used instead
 *   of the DB-stored stripeConnectStatus. Pass this from connect-status.ts so the
 *   activation decision always reflects the freshly-fetched Stripe state, even if
 *   the preceding DB write hasn't been committed yet or failed silently.
 */
export async function tryAutoActivateSeller(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sellerId: string,
  liveStripeConnectStatus?: string,
): Promise<ActivationResult | null> {
  const { data: profile, error } = await supabase
    .from('seller_profiles')
    .select(
      'userId, sellerStatus, activatedAt, storeName, businessName, contactPhone, businessAddress, stripeAccountId, stripeConnectStatus',
    )
    .eq('userId', sellerId)
    .single<SellerProfileSnapshot>();

  if (error || !profile) {
    console.warn(
      'tryAutoActivateSeller: profile not found for',
      sellerId,
      error?.message,
    );
    return null;
  }

  const profileComplete = isProfileComplete(profile);
  // Use the caller-supplied live value when available so we don't depend on a
  // DB read that might reflect a stale stripeConnectStatus (e.g., when the
  // preceding update hasn't committed yet, or failed silently).
  const effectiveStripeConnectStatus = liveStripeConnectStatus ?? profile.stripeConnectStatus;
  const stripeActive = effectiveStripeConnectStatus === 'active';
  const newStatus = deriveSellerStatus(
    profile.sellerStatus,
    profileComplete,
    stripeActive,
  );

  const changed = newStatus !== profile.sellerStatus;
  // firstActivation: true only if this call transitions the seller to 'active'
  // for the very first time (activatedAt was null before this update).
  // This prevents duplicate admin emails when both the Stripe webhook and a
  // connect-status poll fire simultaneously — only the first writer wins.
  const firstActivation =
    changed && newStatus === 'active' && !profile.activatedAt;

  if (changed) {
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({ sellerStatus: newStatus })
      .eq('userId', sellerId);

    if (updateError) {
      console.error(
        'tryAutoActivateSeller: failed to update sellerStatus for',
        sellerId,
        updateError.message,
      );
      return null;
    }

    console.log(
      `tryAutoActivateSeller: ${sellerId} ${profile.sellerStatus} → ${newStatus}`,
    );
  }

  return { sellerStatus: newStatus, profileComplete, stripeConnected: !!profile.stripeAccountId, stripeActive, changed, firstActivation };
}
