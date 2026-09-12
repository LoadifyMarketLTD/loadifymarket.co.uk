import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const wizard = read('src/pages/MobileSellWizard.tsx');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const capacitorBuild = read('android/app/capacitor.build.gradle');

describe('mobile seller native camera contract', () => {
  it('uses the native Capacitor camera for Take photo on Android', () => {
    expect(wizard).toContain("from '@capacitor/camera'");
    expect(wizard).toContain('Capacitor.isNativePlatform()');
    expect(wizard).toContain('NativeCamera.getPhoto({');
    expect(wizard).toContain('source: CameraSource.Camera');
    expect(wizard).toContain('resultType: CameraResultType.Uri');
    expect(wizard).toContain('void handleTakePhoto();');
  });

  it('keeps gallery selection separate and wires the Android camera plugin', () => {
    expect(wizard).toContain('galleryInputRef.current?.click()');
    expect(capacitorBuild).toContain("implementation project(':capacitor-camera')");
    expect(manifest).toContain('android.permission.CAMERA');
    expect(manifest).toContain('android.hardware.camera');
  });
});