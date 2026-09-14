import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_LISTING_PHOTOS,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  MIN_IMAGE_DIMENSION,
  isCancellationError,
  isPermissionError,
} from '@/lib/mobileListingMedia';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const wizard = read('src/pages/MobileSellWizard.tsx');
const recovery = read('src/lib/nativeCameraRecovery.ts');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const mainActivity = read('android/app/src/main/java/co/uk/loadifymarket/app/MainActivity.java');
const normalizer = read('android/app/src/main/java/co/uk/loadifymarket/app/ImageNormalizerPlugin.java');

describe('mobile seller native media contract', () => {
  it('uses current native APIs and keeps browser fallbacks separate', () => {
    expect(wizard).toContain('NativeCamera.takePhoto({');
    expect(wizard).toContain('NativeCamera.chooseFromGallery({');
    expect(wizard).toContain('allowMultipleSelection: true');
    expect(wizard).not.toContain('NativeCamera.getPhoto({');
    expect(wizard).toContain('galleryInputRef.current?.click()');
  });

  it('defines and enforces the listing media limits', () => {
    expect(MAX_LISTING_PHOTOS).toBe(6);
    expect(MAX_SOURCE_IMAGE_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_UPLOAD_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    expect(MIN_IMAGE_DIMENSION).toBe(600);
    expect(wizard).toContain('Promise.allSettled');
    expect(wizard).toContain('Retry failed upload');
  });

  it('normalizes native images and exposes Android app settings', () => {
    expect(mainActivity).toContain('registerPlugin(ImageNormalizerPlugin.class)');
    expect(normalizer).toContain('@CapacitorPlugin(name = "ImageNormalizer")');
    expect(normalizer).toContain('Bitmap.CompressFormat.JPEG');
    expect(normalizer).toContain('Settings.ACTION_APPLICATION_DETAILS_SETTINGS');
  });

  it('supports activity recovery and the Android Photo Picker backport', () => {
    expect(recovery).toContain("addListener('appRestoredResult'");
    expect(manifest).toContain('photopicker_activity:0:required');
    expect(manifest.match(/com\.google\.android\.gms\.metadata\.ModuleDependencies/g)).toHaveLength(1);
  });

  it('classifies cancellation and permission errors', () => {
    expect(isCancellationError({ code: 'OS-PLUG-CAMR-0006' })).toBe(true);
    expect(isCancellationError({ code: 'OS-PLUG-CAMR-0020' })).toBe(true);
    expect(isPermissionError({ code: 'OS-PLUG-CAMR-0003' })).toBe(true);
    expect(isPermissionError({ code: 'OS-PLUG-CAMR-0005' })).toBe(true);
  });
});
