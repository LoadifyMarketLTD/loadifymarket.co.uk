import { App, type RestoredListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const RECOVERY_KEY = 'loadify.mobileSeller.restoredCameraResult.v1';
const RECOVERY_EVENT = 'loadify:native-camera-restored';
const RECOVERY_MAX_AGE_MS = 15 * 60 * 1000;

export type RestoredCameraPayload = {
  methodName: 'takePhoto' | 'chooseFromGallery';
  data: unknown;
  restoredAt: number;
};

let initialised = false;

const isSupportedCameraResult = (event: RestoredListenerEvent) =>
  event.pluginId === 'Camera'
  && event.success
  && (event.methodName === 'takePhoto' || event.methodName === 'chooseFromGallery')
  && event.data != null;

export function initNativeCameraRecovery(): void {
  if (initialised || !Capacitor.isNativePlatform()) return;
  initialised = true;
  void App.addListener('appRestoredResult', (event) => {
    if (!isSupportedCameraResult(event)) return;
    const payload: RestoredCameraPayload = {
      methodName: event.methodName as RestoredCameraPayload['methodName'],
      data: event.data,
      restoredAt: Date.now(),
    };
    try {
      window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(payload));
    } catch {
      // The in-memory DOM event still lets an already-mounted sell screen recover.
    }
    window.dispatchEvent(new CustomEvent<RestoredCameraPayload>(RECOVERY_EVENT, { detail: payload }));
  });
}

export function readPendingCameraRecovery(): RestoredCameraPayload | null {
  try {
    const raw = window.localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as RestoredCameraPayload;
    if (!payload.restoredAt || Date.now() - payload.restoredAt > RECOVERY_MAX_AGE_MS) {
      window.localStorage.removeItem(RECOVERY_KEY);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
export function clearPendingCameraRecovery(): void {
  try {
    window.localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Nothing else to clear.
  }
}

export function onNativeCameraRecovered(
  listener: (payload: RestoredCameraPayload) => void,
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<RestoredCameraPayload>;
    if (customEvent.detail) listener(customEvent.detail);
  };
  window.addEventListener(RECOVERY_EVENT, handler);
  return () => window.removeEventListener(RECOVERY_EVENT, handler);
}
