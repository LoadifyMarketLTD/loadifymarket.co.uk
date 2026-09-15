import { supabase } from './supabase';
import type { PreparedListingImage } from './mobileListingMedia';

export const CASE_EVIDENCE_BUCKET = 'case-evidence';
export const MAX_CASE_EVIDENCE_FILES = 6;

export type CaseEvidenceKind = 'return' | 'dispute' | 'seller-response';

function safeExtension(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadCaseEvidence(
  files: PreparedListingImage[],
  userId: string,
  orderId: string,
  kind: CaseEvidenceKind,
): Promise<string[]> {
  if (files.length > MAX_CASE_EVIDENCE_FILES) {
    throw new Error(`Add no more than ${MAX_CASE_EVIDENCE_FILES} evidence photos.`);
  }

  const uploaded: string[] = [];
  try {
    for (const item of files) {
      const path = `${userId}/orders/${orderId}/${kind}/${crypto.randomUUID()}.${safeExtension(item.file)}`;
      const { error } = await supabase.storage
        .from(CASE_EVIDENCE_BUCKET)
        .upload(path, item.file, {
          cacheControl: '3600',
          contentType: item.file.type,
          upsert: false,
        });
      if (error) throw error;
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length > 0) {
      await supabase.storage.from(CASE_EVIDENCE_BUCKET).remove(uploaded);
    }
    throw error;
  }
}

export async function removeCaseEvidence(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(CASE_EVIDENCE_BUCKET).remove(paths);
}
export async function openCaseEvidence(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CASE_EVIDENCE_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Evidence image is unavailable.');
  }
  return data.signedUrl;
}
