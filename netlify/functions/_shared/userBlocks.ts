import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserBlockRelationship {
  available: boolean;
  blocked: boolean;
  blockedByFirst: boolean;
  blockedBySecond: boolean;
}

function isMissingUserBlocksTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  return /user_blocks/i.test(error.message ?? '') && /not found|could not find|does not exist/i.test(error.message ?? '');
}

export async function getUserBlockRelationship(
  supabase: SupabaseClient,
  firstUserId: string,
  secondUserId: string,
): Promise<UserBlockRelationship> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blockerId, blockedId')
    .or(
      `and(blockerId.eq.${firstUserId},blockedId.eq.${secondUserId}),` +
      `and(blockerId.eq.${secondUserId},blockedId.eq.${firstUserId})`,
    )
    .limit(2);

  if (error) {
    if (isMissingUserBlocksTable(error)) {
      return { available: false, blocked: false, blockedByFirst: false, blockedBySecond: false };
    }
    throw error;
  }

  const rows = (data ?? []) as Array<{ blockerId: string; blockedId: string }>;
  const blockedByFirst = rows.some(
    (row) => row.blockerId === firstUserId && row.blockedId === secondUserId,
  );
  const blockedBySecond = rows.some(
    (row) => row.blockerId === secondUserId && row.blockedId === firstUserId,
  );

  return {
    available: true,
    blocked: blockedByFirst || blockedBySecond,
    blockedByFirst,
    blockedBySecond,
  };
}
