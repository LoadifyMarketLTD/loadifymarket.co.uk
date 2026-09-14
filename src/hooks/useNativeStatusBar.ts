import { useEffect } from 'react';
import { isCapacitorNative } from '@/lib/capacitorUtils';

type NativeStatusBarStyle = 'DARK' | 'LIGHT';

/** Keeps Android/iOS system icons readable when a mobile route changes its top background. */
export function useNativeStatusBar(style: NativeStatusBarStyle, restore: NativeStatusBarStyle = 'LIGHT') {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let active = true;
    const apply = async (next: NativeStatusBarStyle) => {
      const [{ StatusBar, Style }] = await Promise.all([import('@capacitor/status-bar')]);
      if (!active && next === style) return;
      await StatusBar.setStyle({ style: next === 'DARK' ? Style.Dark : Style.Light });
    };

    void apply(style).catch(() => undefined);
    return () => {
      active = false;
      void apply(restore).catch(() => undefined);
    };
  }, [restore, style]);
}
