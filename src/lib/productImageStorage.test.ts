import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: storageMocks.from,
    },
  },
}));

import {
  MAX_PRODUCT_IMAGE_SIZE,
  ProductImageStorageError,
  resolveProductImageMetadata,
  uploadProductImageBatch,
} from '@/lib/productImageStorage';

function makeFile(name: string, type: string, size = 32): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('productImageStorage', () => {
  beforeEach(() => {
    storageMocks.upload.mockReset();
    storageMocks.remove.mockReset();
    storageMocks.getPublicUrl.mockReset();
    storageMocks.from.mockReset();

    storageMocks.from.mockReturnValue({
      upload: storageMocks.upload,
      remove: storageMocks.remove,
      getPublicUrl: storageMocks.getPublicUrl,
    });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });
    storageMocks.getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://cdn.example.test/${path}` },
    }));
  });

  it('uses MIME as the source of truth for deterministic extension handling', () => {
    const metadata = resolveProductImageMetadata(makeFile('camera.weird', 'image/jpeg'));
    expect(metadata).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('falls back to a known filename extension only when the browser supplies no MIME', () => {
    const metadata = resolveProductImageMetadata(makeFile('gallery.PNG', ''));
    expect(metadata).toEqual({ contentType: 'image/png', extension: 'png' });
  });

  it('rejects unsupported formats before upload', () => {
    expect(() => resolveProductImageMetadata(makeFile('photo.heic', 'image/heic'))).toThrow(
      ProductImageStorageError,
    );
  });

  it('rejects oversized files before upload', () => {
    const file = makeFile('large.jpg', 'image/jpeg', MAX_PRODUCT_IMAGE_SIZE + 1);
    expect(() => resolveProductImageMetadata(file)).toThrow(/up to 5MB/i);
  });

  it('rolls back successful objects when another file in the same batch fails', async () => {
    storageMocks.upload
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'network failure' } });

    await expect(
      uploadProductImageBatch(
        [makeFile('one.jpg', 'image/jpeg'), makeFile('two.png', 'image/png')],
        'seller-123',
      ),
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });

    expect(storageMocks.remove).toHaveBeenCalledTimes(1);
    const [paths] = storageMocks.remove.mock.calls[0] as [string[]];
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^sellers\/seller-123\/.+\.jpg$/);
  });

  it('does not start network uploads when the selection contains a known-invalid file', async () => {
    await expect(
      uploadProductImageBatch(
        [makeFile('valid.jpg', 'image/jpeg'), makeFile('invalid.heic', 'image/heic')],
        'seller-123',
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });

    expect(storageMocks.upload).not.toHaveBeenCalled();
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });
});
